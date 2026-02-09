import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canExport } from "@/lib/auth/rbac";
import { exportToInputCSV, exportToOutputCSV, getExportFilename } from "@/lib/export/toCsv";
import { FlightType, PaymentStatus, AdvanceExtend, Prisma } from "@prisma/client";

// GET /api/services/export - Export services to CSV
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canExport(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;

        // Export format
        const format = searchParams.get("format") || "output"; // "input" or "output"

        // Filters
        const flightType = searchParams.get("flightType") as FlightType | undefined;
        const status = searchParams.get("status") as PaymentStatus | undefined;
        const advanceExtend = searchParams.get("advanceExtend") as AdvanceExtend | undefined;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // Build where clause
        const where: Prisma.FlightServiceWhereInput = {};

        if (flightType) {
            where.flightType = flightType;
        }

        if (status) {
            where.status = status;
        }

        if (advanceExtend) {
            where.advanceExtend = advanceExtend;
        }

        if (dateFrom || dateTo) {
            where.arrivalDate = {};
            if (dateFrom) {
                where.arrivalDate.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.arrivalDate.lte = new Date(dateTo);
            }
        }

        // Fetch services
        const services = await prisma.flightService.findMany({
            where,
            orderBy: { arrivalDate: "desc" },
        });

        // Generate CSV
        const csv = format === "input"
            ? exportToInputCSV(services)
            : exportToOutputCSV(services);

        const filename = getExportFilename(
            format as "input" | "output",
            dateFrom || dateTo ? {
                from: dateFrom ? new Date(dateFrom) : undefined,
                to: dateTo ? new Date(dateTo) : undefined,
            } : undefined
        );

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting CSV:", error);
        return NextResponse.json(
            { error: "Failed to export CSV" },
            { status: 500 }
        );
    }
}
