import { prisma } from "@/lib/db/prisma";

export type SignatureType = "PIC_DINAS" | "KEPALA_BANDARA";

export interface SignatureData {
    name: string;
    title?: string;
    imageData: string;
}

/**
 * Get active signature by type
 */
export async function getActiveSignature(type: SignatureType): Promise<SignatureData | null> {
    try {
        const signature = await prisma.signature.findFirst({
            where: {
                type,
                isActive: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (!signature) return null;

        return {
            name: signature.name,
            title: signature.title || undefined,
            imageData: signature.imageData,
        };
    } catch (error) {
        console.error("Error fetching signature:", error);
        return null;
    }
}

/**
 * Get all active signatures
 */
export async function getAllActiveSignatures(): Promise<{
    picDinas: SignatureData | null;
    kepalaBandara: SignatureData | null;
}> {
    const [picDinas, kepalaBandara] = await Promise.all([
        getActiveSignature("PIC_DINAS"),
        getActiveSignature("KEPALA_BANDARA"),
    ]);

    return {
        picDinas,
        kepalaBandara,
    };
}
