import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canRead } from "@/lib/auth/rbac";
import { generateWordFromTemplate } from "@/lib/word/templateProcessor";

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/services/[id]/word - Download filled Word document
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

        // Generate filled Word document
        const wordBuffer = await generateWordFromTemplate(
            templateName,
            service,
            signature?.name,
            signature?.imageData || undefined
        );

        // Return Word document (convert Buffer to Uint8Array for NextResponse)
        return new NextResponse(new Uint8Array(wordBuffer), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="invoice_${service.receiptNo || service.id}.docx"`,
            },
        });
    } catch (error) {
        console.error("Error generating Word document:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate Word document" },
            { status: 500 }
        );
    }
}
