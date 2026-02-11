import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canCreate } from "@/lib/auth/rbac";
import {
    generateReceiptPdf,
    generateBreakdownPdf,
    generateCombinedPdf,
} from "@/lib/pdf/generatePdf";

interface Params {
    params: Promise<{ id: string }>;
}

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

        // 1. Generate PDF di memori saja (Tanpa savePdf karena Vercel Read-Only)
        // Fungsi generate ini sekarang menggunakan Puppeteer + Chromium-min yang kita pasang tadi
        await Promise.all([
            generateReceiptPdf(service),
            generateBreakdownPdf(service),
            generateCombinedPdf(service),
        ]);

        // 2. Gunakan Nama File sebagai path (Bukan path folder storage)
        const receiptName = `receipt_${service.receiptNo.replace(/\./g, "_")}.pdf`;
        const breakdownName = `breakdown_${service.receiptNo.replace(/\./g, "_")}.pdf`;
        const combinedName = `combined_${service.receiptNo.replace(/\./g, "_")}.pdf`;

        // 3. Update database dengan nama file tersebut
        await prisma.flightService.update({
            where: { id },
            data: {
                pdfReceiptPath: receiptName,
                pdfBreakdownPath: breakdownName,
                pdfCombinedPath: combinedName,
            },
        });

        return NextResponse.json({
            success: true,
            paths: {
                receipt: receiptName,
                breakdown: breakdownName,
                combined: combinedName,
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
