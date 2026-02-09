export interface PdfGenerationOptions {
    serviceId: string;
    type: "receipt" | "breakdown" | "combined";
}

export interface PdfPaths {
    receiptPath?: string;
    breakdownPath?: string;
    combinedPath?: string;
}

export interface BreakdownRow {
    unit: "APP" | "TWR" | "AFIS";
    startTime: string;
    endTime: string;
    duration: string;
    billableHours: number;
    rate: number;
    gross: bigint;
}
