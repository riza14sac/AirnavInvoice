import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canCreate } from "@/lib/auth/rbac";
import {
    generateReceiptPdf,
    generateBreakdownPdf,
    generateCombinedPdf,
    savePdf,
} from "@/lib/pdf/generatePdf";

interface Params {
    params: Promise<{ id: string }>;
}

// POST /api/services/[id]/generate-pdf - Generate all PDFs for a service
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canCreate(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const service = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!service) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        // Generate all three PDFs
        const [receiptBuffer, breakdownBuffer, combinedBuffer] = await Promise.all([
            generateReceiptPdf(service),
            generateBreakdownPdf(service),
            generateCombinedPdf(service),
        ]);

        // Save to storage
        const [receiptPath, breakdownPath, combinedPath] = await Promise.all([
            savePdf(receiptBuffer, "receipt", service.receiptNo),
            savePdf(breakdownBuffer, "breakdown", service.receiptNo),
            savePdf(combinedBuffer, "combined", service.receiptNo),
        ]);

        // Update service with PDF paths
        await prisma.flightService.update({
            where: { id },
            data: {
                pdfReceiptPath: receiptPath,
                pdfBreakdownPath: breakdownPath,
                pdfCombinedPath: combinedPath,
            },
        });

        return NextResponse.json({
            success: true,
            paths: {
                receipt: receiptPath,
                breakdown: breakdownPath,
                combined: combinedPath,
            },
        });
    } catch (error) {
        console.error("Error generating PDFs:", error);
        return NextResponse.json(
            { error: "Failed to generate PDFs" },
            { status: 500 }
        );
    }
}
