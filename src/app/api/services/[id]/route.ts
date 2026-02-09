import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canRead, canUpdate, canDelete } from "@/lib/auth/rbac";
import { serviceSchema } from "@/validators/service.schema";
import { calculateBilling } from "@/lib/calc/billing";
import { FlightType, AdvanceExtend } from "@prisma/client";

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/services/[id] - Get a single service
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canRead(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const service = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!service) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        // Convert BigInt for response
        const response = {
            ...service,
            grossApp: service.grossApp.toString(),
            grossTwr: service.grossTwr.toString(),
            grossAfis: service.grossAfis.toString(),
            grossTotal: service.grossTotal.toString(),
            ppn: service.ppn.toString(),
            netTotal: service.netTotal.toString(),
            amountPaid: service.amountPaid?.toString(),
            paymentDifference: service.paymentDifference?.toString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching service:", error);
        return NextResponse.json(
            { error: "Failed to fetch service" },
            { status: 500 }
        );
    }
}

// PUT /api/services/[id] - Update a service
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canUpdate(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const validatedData = serviceSchema.parse(body);

        // Check if service exists
        const existing = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        // Recalculate billing
        const billing = calculateBilling({
            serviceStartUtc: validatedData.serviceStartUtc,
            serviceEndUtc: validatedData.serviceEndUtc,
            useApp: validatedData.useApp,
            useTwr: validatedData.useTwr,
            useAfis: validatedData.useAfis,
        });

        // Update service (receipt number remains unchanged)
        const service = await prisma.flightService.update({
            where: { id },
            data: {
                airline: validatedData.airline,
                flightType: validatedData.flightType as FlightType,
                flightNumber: validatedData.flightNumber,
                flightNumber2: validatedData.flightNumber2,
                registration: validatedData.registration,
                aircraftType: validatedData.aircraftType,
                depStation: validatedData.depStation,
                arrStation: validatedData.arrStation,
                arrivalDate: validatedData.arrivalDate,
                ataUtc: validatedData.ataUtc,
                atdUtc: validatedData.atdUtc,
                advanceExtend: validatedData.advanceExtend as AdvanceExtend,
                serviceStartUtc: validatedData.serviceStartUtc,
                serviceEndUtc: validatedData.serviceEndUtc,
                useApp: validatedData.useApp,
                useTwr: validatedData.useTwr,
                useAfis: validatedData.useAfis,
                picDinas: validatedData.picDinas,
                durationMinutes: billing.durationMinutes,
                billableHours: billing.billableHours,
                grossApp: billing.grossApp,
                grossTwr: billing.grossTwr,
                grossAfis: billing.grossAfis,
                grossTotal: billing.grossTotal,
                ppn: billing.ppn,
                netTotal: billing.netTotal,
            },
        });

        // Convert BigInt for response
        const response = {
            ...service,
            grossApp: service.grossApp.toString(),
            grossTwr: service.grossTwr.toString(),
            grossAfis: service.grossAfis.toString(),
            grossTotal: service.grossTotal.toString(),
            ppn: service.ppn.toString(),
            netTotal: service.netTotal.toString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error updating service:", error);
        if (error instanceof Error && error.name === "ZodError") {
            return NextResponse.json(
                { error: "Validation failed", details: error },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to update service" },
            { status: 500 }
        );
    }
}

// DELETE /api/services/[id] - Delete a service
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canDelete(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const existing = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        await prisma.flightService.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting service:", error);
        return NextResponse.json(
            { error: "Failed to delete service" },
            { status: 500 }
        );
    }
}
