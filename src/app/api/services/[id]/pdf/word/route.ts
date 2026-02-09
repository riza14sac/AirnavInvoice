import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canRead } from "@/lib/auth/rbac";
import { generatePdfFromWordTemplate } from "@/lib/word/templateProcessor";

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/services/[id]/pdf/word - Generate PDF from Word template
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const service = await prisma.flightService.findUnique({
            where: { id },
        });

        if (!service) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        if (!canRead(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get active signature
        const signature = await prisma.signature.findFirst({
            where: { type: "PIC_DINAS", isActive: true },
        });

        // Get template name from query params, or auto-select based on currency
        const searchParams = request.nextUrl.searchParams;
        let templateName = searchParams.get("template");
        if (!templateName) {
            templateName = service.currency === "USD"
                ? "Template_Placeholder_USD.docx"
                : "Template_Placeholder_IDR.docx";
        }

        // Generate PDF from Word template
        const pdfBuffer = await generatePdfFromWordTemplate(
            templateName,
            service,
            signature?.name,
            signature?.imageData || undefined
        );

        // Return PDF (convert Buffer to Uint8Array for NextResponse)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="invoice_${service.receiptNo || service.id}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Error generating PDF from Word template:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
