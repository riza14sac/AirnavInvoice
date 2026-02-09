import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canImport } from "@/lib/auth/rbac";
import { parseCSV, parseBoolean } from "@/lib/csv/parse";
import { importRowSchema } from "@/validators/import.schema";
import { calculateBilling } from "@/lib/calc/billing";
import { generateReceiptNo } from "@/lib/calc/receiptNo";
import { FlightType, AdvanceExtend } from "@prisma/client";
import { parseISO } from "date-fns";
import { getUsdToIdrRate } from "@/lib/api/exchangeRate";

// POST /api/services/import-csv - Import services from CSV
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canImport(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const previewOnly = formData.get("preview") === "true";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const content = await file.text();
        const { headers, rows } = parseCSV(content);

        const validatedRows: Array<{
            rowNumber: number;
            isValid: boolean;
            data?: Record<string, unknown>;
            errors: string[];
        }> = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 for header row and 1-indexing

            try {
                const parsed = importRowSchema.parse(row);
                validatedRows.push({
                    rowNumber,
                    isValid: true,
                    data: parsed,
                    errors: [],
                });
            } catch (error) {
                const errors: string[] = [];
                if (error instanceof Error && "issues" in error) {
                    const zodError = error as { issues: Array<{ path: string[]; message: string }> };
                    zodError.issues.forEach((issue) => {
                        errors.push(`${issue.path.join(".")}: ${issue.message}`);
                    });
                } else {
                    errors.push("Unknown validation error");
                }
                validatedRows.push({
                    rowNumber,
                    isValid: false,
                    data: row,
                    errors,
                });
            }
        }

        // If preview only, return validation results
        if (previewOnly) {
            return NextResponse.json({
                headers,
                totalRows: rows.length,
                validRows: validatedRows.filter((r) => r.isValid).length,
                invalidRows: validatedRows.filter((r) => !r.isValid).length,
                rows: validatedRows.slice(0, 100), // Limit preview
            });
        }

        // Import valid rows
        const validData = validatedRows.filter((r) => r.isValid);
        const importErrors: Array<{ row: number; message: string }> = [];
        let importedCount = 0;

        // Pre-fetch exchange rate for INT flights
        let exchangeRate: number | null = null;
        const hasIntFlights = validData.some((r) => r.data?.flight_type === "INT");
        if (hasIntFlights) {
            try {
                exchangeRate = await getUsdToIdrRate();
            } catch (e) {
                console.error("Failed to fetch exchange rate for import:", e);
                exchangeRate = 16000; // Fallback
            }
        }

        for (const { rowNumber, data } of validData) {
            if (!data) continue;

            try {
                // Parse dates and times
                const arrivalDate = parseISO(data.arrival_date as string);
                const ataTime = data.ata_utc as string;
                const atdTime = data.atd_utc as string;
                const startTime = data.service_start_utc as string;
                const endTime = data.service_end_utc as string;

                // Combine date with time for full datetime
                const ataUtc = new Date(arrivalDate);
                const ataParts = ataTime.split(":").map(Number);
                ataUtc.setUTCHours(ataParts[0] || 0, ataParts[1] || 0, ataParts[2] || 0, 0);

                let atdUtc: Date | null = null;
                if (atdTime) {
                    atdUtc = new Date(arrivalDate);
                    const atdParts = atdTime.split(":").map(Number);
                    atdUtc.setUTCHours(atdParts[0] || 0, atdParts[1] || 0, atdParts[2] || 0, 0);
                }

                const serviceStartUtc = new Date(arrivalDate);
                const startParts = startTime.split(":").map(Number);
                serviceStartUtc.setUTCHours(startParts[0] || 0, startParts[1] || 0, startParts[2] || 0, 0);

                const serviceEndUtc = new Date(arrivalDate);
                const endParts = endTime.split(":").map(Number);
                serviceEndUtc.setUTCHours(endParts[0] || 0, endParts[1] || 0, endParts[2] || 0, 0);

                // Handle day rollover
                if (serviceEndUtc < serviceStartUtc) {
                    serviceEndUtc.setUTCDate(serviceEndUtc.getUTCDate() + 1);
                }

                const useApp = parseBoolean(data.unit_app as string);
                const useTwr = parseBoolean(data.unit_twr as string);
                const useAfis = parseBoolean(data.unit_afis as string);

                // Calculate billing
                const billing = calculateBilling({
                    serviceStartUtc,
                    serviceEndUtc,
                    useApp,
                    useTwr,
                    useAfis,
                });

                // Generate receipt number
                const receiptNo = await generateReceiptNo(
                    prisma,
                    ataUtc,
                    data.flight_type as FlightType
                );

                // Create service
                const flightType = data.flight_type as FlightType;
                await prisma.flightService.create({
                    data: {
                        airline: data.airline_operator_gh as string,
                        flightType,
                        flightNumber: data.flight_number as string,
                        flightNumber2: (data.flight_number_2 as string) || null,
                        registration: data.registration as string,
                        aircraftType: data.aircraft_type as string,
                        depStation: data.departure as string,
                        arrStation: data.arrival as string,
                        arrivalDate,
                        ataUtc,
                        atdUtc,
                        advanceExtend: data.advance_extend as AdvanceExtend,
                        serviceStartUtc,
                        serviceEndUtc,
                        useApp,
                        useTwr,
                        useAfis,
                        // Auto-set currency based on flightType: INT = USD, DOM = IDR
                        currency: flightType === "INT" ? "USD" : "IDR",
                        exchangeRate: flightType === "INT" ? exchangeRate : null,
                        picDinas: (data.pic_dinas as string) || null,
                        durationMinutes: billing.durationMinutes,
                        billableHours: billing.billableHours,
                        grossApp: billing.grossApp,
                        grossTwr: billing.grossTwr,
                        grossAfis: billing.grossAfis,
                        grossTotal: billing.grossTotal,
                        ppn: billing.ppn,
                        netTotal: billing.netTotal,
                        receiptNo,
                    },
                });

                importedCount++;
            } catch (error) {
                importErrors.push({
                    row: rowNumber,
                    message: error instanceof Error ? error.message : "Failed to import",
                });
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: rows.length,
            validRows: validData.length,
            invalidRows: validatedRows.filter((r) => !r.isValid).length,
            importedCount,
            errors: [
                ...validatedRows
                    .filter((r) => !r.isValid)
                    .map((r) => ({ row: r.rowNumber, message: r.errors.join("; ") })),
                ...importErrors,
            ],
        });
    } catch (error) {
        console.error("Error importing CSV:", error);
        return NextResponse.json(
            { error: "Failed to import CSV" },
            { status: 500 }
        );
    }
}
