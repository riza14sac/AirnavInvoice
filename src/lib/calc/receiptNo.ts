import { PrismaClient, FlightType } from "@prisma/client";
import { AIRPORT_CODE, FLIGHT_TYPE_CODES } from "@/lib/config/rates";
import { getWibYearMonth } from "@/lib/time/tz";
import { padNumber } from "@/lib/time/format";
import { RECEIPT_NUMBER_PADDING } from "@/lib/config/constants";

/**
 * Generate a unique receipt number with transaction safety
 * Format: WITT.<CODE>.<YYYY>.<MM>.<NNNN>
 * 
 * Uses a transaction to atomically increment the counter
 * to prevent duplicates in concurrent scenarios
 */
export async function generateReceiptNo(
    prisma: PrismaClient,
    referenceDate: Date, // Can be ataUtc or atdUtc - whichever is available
    flightType: FlightType
): Promise<string> {
    // Get year and month from reference date in WIB timezone
    const { year, month } = getWibYearMonth(referenceDate);

    // Get code based on flight type
    const code = FLIGHT_TYPE_CODES[flightType];

    // Use a transaction with serializable isolation to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
        // Try to find existing counter
        let counter = await tx.receiptCounter.findUnique({
            where: {
                year_month_code: {
                    year,
                    month,
                    code,
                },
            },
        });

        if (counter) {
            // Increment existing counter
            counter = await tx.receiptCounter.update({
                where: {
                    year_month_code: {
                        year,
                        month,
                        code,
                    },
                },
                data: {
                    lastSeq: counter.lastSeq + 1,
                },
            });
        } else {
            // Create new counter starting at 1
            counter = await tx.receiptCounter.create({
                data: {
                    year,
                    month,
                    code,
                    lastSeq: 1,
                },
            });
        }

        return counter.lastSeq;
    });

    // Format the receipt number
    // WITT.21.2025.12.0001
    const receiptNo = [
        AIRPORT_CODE,
        code,
        year.toString(),
        padNumber(month, 2),
        padNumber(result, RECEIPT_NUMBER_PADDING),
    ].join(".");

    return receiptNo;
}

/**
 * Parse a receipt number to extract its components
 */
export function parseReceiptNo(receiptNo: string): {
    airportCode: string;
    typeCode: string;
    year: number;
    month: number;
    sequence: number;
} | null {
    const parts = receiptNo.split(".");
    if (parts.length !== 5) return null;

    const [airportCode, typeCode, yearStr, monthStr, seqStr] = parts;

    return {
        airportCode,
        typeCode,
        year: parseInt(yearStr, 10),
        month: parseInt(monthStr, 10),
        sequence: parseInt(seqStr, 10),
    };
}

/**
 * Get the next expected receipt number (for preview purposes only)
 * This does NOT reserve the number - use generateReceiptNo for actual generation
 */
export async function previewNextReceiptNo(
    prisma: PrismaClient,
    ataUtc: Date,
    flightType: FlightType
): Promise<string> {
    const { year, month } = getWibYearMonth(ataUtc);
    const code = FLIGHT_TYPE_CODES[flightType];

    const counter = await prisma.receiptCounter.findUnique({
        where: {
            year_month_code: {
                year,
                month,
                code,
            },
        },
    });

    const nextSeq = (counter?.lastSeq ?? 0) + 1;

    return [
        AIRPORT_CODE,
        code,
        year.toString(),
        padNumber(month, 2),
        padNumber(nextSeq, RECEIPT_NUMBER_PADDING),
    ].join(".");
}
