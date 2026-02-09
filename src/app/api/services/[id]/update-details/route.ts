import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canCreate } from "@/lib/auth/rbac";

interface Params {
    params: Promise<{ id: string }>;
}

interface UpdateBody {
    fakturPajakNo?: string;
    fakturPajakDate?: string;
    pph23Withheld?: boolean;
    monitoringStatus?: "PENDING" | "BILLED" | "DEPOSIT" | "COMPLETED";
}

// PATCH /api/services/[id]/update-details - Update faktur pajak, PPH 23, or monitoring status
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canCreate(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body: UpdateBody = await request.json();

        const existing = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        // Build update data
        const updateData: {
            fakturPajakNo?: string;
            fakturPajakDate?: Date;
            pph23Withheld?: boolean;
            monitoringStatus?: "PENDING" | "BILLED" | "DEPOSIT" | "COMPLETED";
        } = {};

        if (body.fakturPajakNo !== undefined) {
            updateData.fakturPajakNo = body.fakturPajakNo;
        }

        if (body.fakturPajakDate !== undefined) {
            updateData.fakturPajakDate = new Date(body.fakturPajakDate);
        }

        if (body.pph23Withheld !== undefined) {
            updateData.pph23Withheld = body.pph23Withheld;
        }

        if (body.monitoringStatus !== undefined) {
            updateData.monitoringStatus = body.monitoringStatus;
        }

        const service = await prisma.flightService.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            id: service.id,
            fakturPajakNo: service.fakturPajakNo,
            fakturPajakDate: service.fakturPajakDate,
            pph23Withheld: service.pph23Withheld,
            monitoringStatus: service.monitoringStatus,
        });
    } catch (error) {
        console.error("Error updating service details:", error);
        return NextResponse.json(
            { error: "Failed to update service details" },
            { status: 500 }
        );
    }
}
