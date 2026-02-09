import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canRead } from "@/lib/auth/rbac";
import { generatePdfFromWordTemplate } from "@/lib/templates/wordGenerator";

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/services/[id]/pdf/combined - Download combined PDF from Word template
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

        // Get active signature with image
        const signature = await prisma.signature.findFirst({
            where: { type: "PIC_DINAS", isActive: true },
        });

        // Generate PDF from Word template with signature - both pages (combined)
        const pdfBuffer = await generatePdfFromWordTemplate(
            service,
            signature?.name,
            signature?.imageData,
            "combined"
        );

        const filename = `Invoice_${service.receiptNo.replace(/\./g, "_")}.pdf`;

        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error generating combined PDF:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
