import { UNIT_RATES, PPN_RATE } from "@/lib/config/rates";

export interface BillingInput {
    serviceStartUtc: Date;
    serviceEndUtc: Date;
    useApp: boolean;
    useTwr: boolean;
    useAfis: boolean;
}

export interface BillingResult {
    durationMinutes: number;
    billableHours: number;
    grossApp: bigint;
    grossTwr: bigint;
    grossAfis: bigint;
    grossTotal: bigint;
    ppn: bigint;
    netTotal: bigint;
}

/**
 * Calculate duration in minutes between two dates
 */
export function calculateDurationMinutes(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

/**
 * Calculate billable hours (ceiling, minimum 1 hour if any duration)
 * Any fraction of an hour is billed as a full hour
 */
export function calculateBillableHours(minutes: number): number {
    if (minutes <= 0) return 0;
    return Math.ceil(minutes / 60);
}

/**
 * Calculate gross amount for a specific unit
 */
export function calculateUnitGross(
    billableHours: number,
    unit: "APP" | "TWR" | "AFIS",
    isUsed: boolean
): bigint {
    if (!isUsed) return BigInt(0);
    return BigInt(billableHours * UNIT_RATES[unit]);
}

/**
 * Calculate PPN (12% VAT)
 * Based on PMK No.131 Tahun 2024: DPP = 11/12 * harga jual, PPN = 12% * DPP
 * Effectively: PPN = 11/12 * 12% * grossTotal = 11% of grossTotal
 * But user shows 12% directly on gross, so we use 12% directly
 */
export function calculatePPN(grossTotal: bigint): bigint {
    // Using 12% directly as shown in the template
    return BigInt(Math.floor(Number(grossTotal) * PPN_RATE));
}

/**
 * Calculate complete billing for a service
 */
export function calculateBilling(input: BillingInput): BillingResult {
    const durationMinutes = calculateDurationMinutes(
        input.serviceStartUtc,
        input.serviceEndUtc
    );
    const billableHours = calculateBillableHours(durationMinutes);

    const grossApp = calculateUnitGross(billableHours, "APP", input.useApp);
    const grossTwr = calculateUnitGross(billableHours, "TWR", input.useTwr);
    const grossAfis = calculateUnitGross(billableHours, "AFIS", input.useAfis);

    const grossTotal = grossApp + grossTwr + grossAfis;
    const ppn = calculatePPN(grossTotal);
    const netTotal = grossTotal + ppn;

    return {
        durationMinutes,
        billableHours,
        grossApp,
        grossTwr,
        grossAfis,
        grossTotal,
        ppn,
        netTotal,
    };
}

/**
 * Get rate for a unit
 */
export function getUnitRate(unit: "APP" | "TWR" | "AFIS"): number {
    return UNIT_RATES[unit];
}

/**
 * Get all active unit rates for a service
 */
export function getActiveUnits(
    useApp: boolean,
    useTwr: boolean,
    useAfis: boolean
): Array<{ unit: "APP" | "TWR" | "AFIS"; rate: number }> {
    const units: Array<{ unit: "APP" | "TWR" | "AFIS"; rate: number }> = [];
    if (useApp) units.push({ unit: "APP", rate: UNIT_RATES.APP });
    if (useTwr) units.push({ unit: "TWR", rate: UNIT_RATES.TWR });
    if (useAfis) units.push({ unit: "AFIS", rate: UNIT_RATES.AFIS });
    return units;
}
