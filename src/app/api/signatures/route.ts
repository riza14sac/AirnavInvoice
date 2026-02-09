import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canCreate, canRead } from "@/lib/auth/rbac";

// GET /api/signatures - Get all active signatures
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canRead(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const signatures = await prisma.signature.findMany({
            where: { isActive: true },
            orderBy: { type: "asc" },
        });

        return NextResponse.json(signatures);
    } catch (error) {
        console.error("Error fetching signatures:", error);
        return NextResponse.json(
            { error: "Failed to fetch signatures" },
            { status: 500 }
        );
    }
}

// POST /api/signatures - Create or update a signature
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canCreate(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, title, type, imageData } = body;

        if (!name || !type || !imageData) {
            return NextResponse.json(
                { error: "Name, type, and imageData are required" },
                { status: 400 }
            );
        }

        // Deactivate existing signature of same type
        await prisma.signature.updateMany({
            where: { type, isActive: true },
            data: { isActive: false },
        });

        // Create new signature
        const signature = await prisma.signature.create({
            data: {
                name,
                title,
                type,
                imageData,
            },
        });

        return NextResponse.json(signature, { status: 201 });
    } catch (error) {
        console.error("Error creating signature:", error);
        return NextResponse.json(
            { error: "Failed to create signature" },
            { status: 500 }
        );
    }
}
