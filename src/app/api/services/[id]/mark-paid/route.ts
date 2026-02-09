import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canMarkPaid } from "@/lib/auth/rbac";
import { differenceInDays } from "date-fns";
import { PaymentStatus } from "@prisma/client";

interface Params {
    params: Promise<{ id: string }>;
}

interface PaymentBody {
    amountPaid: string;  // Amount paid in string format (for BigInt)
}

// POST /api/services/[id]/mark-paid - Mark a service as paid with amount calculation
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canMarkPaid(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body: PaymentBody = await request.json();

        const existing = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        // Parse amount paid
        const amountPaid = BigInt(body.amountPaid || existing.netTotal.toString());
        const netTotal = existing.netTotal;

        // Calculate payment difference
        const paymentDifference = amountPaid - netTotal;

        // Determine payment status based on difference
        let status: "PAID" | "UNDERPAID" | "OVERPAID";
        if (paymentDifference === BigInt(0)) {
            status = "PAID";
        } else if (paymentDifference < BigInt(0)) {
            status = "UNDERPAID";
        } else {
            status = "OVERPAID";
        }

        // Calculate payment days (from creation to now)
        const paidAt = new Date();
        const paymentDays = differenceInDays(paidAt, existing.createdAt);

        const service = await prisma.flightService.update({
            where: { id },
            data: {
                status,
                paidAt,
                amountPaid,
                paymentDifference,
                paymentDays,
                monitoringStatus: "COMPLETED",
            },
        });

        return NextResponse.json({
            id: service.id,
            status: service.status,
            paidAt: service.paidAt,
            amountPaid: service.amountPaid?.toString(),
            paymentDifference: service.paymentDifference?.toString(),
            paymentDays: service.paymentDays,
            monitoringStatus: service.monitoringStatus,
        });
    } catch (error) {
        console.error("Error marking service as paid:", error);
        return NextResponse.json(
            { error: "Failed to update payment status" },
            { status: 500 }
        );
    }
}
