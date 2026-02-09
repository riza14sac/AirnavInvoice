import { FlightType, PaymentStatus, AdvanceExtend } from "@prisma/client";

export interface ServiceInput {
    airline: string;
    flightType: FlightType;
    flightNumber: string;
    flightNumber2?: string;
    registration: string;
    aircraftType: string;
    depStation: string;
    arrStation: string;
    arrivalDate: Date;
    ataUtc: Date;
    atdUtc?: Date;
    advanceExtend: AdvanceExtend;
    serviceStartUtc: Date;
    serviceEndUtc: Date;
    useApp: boolean;
    useTwr: boolean;
    useAfis: boolean;
    picDinas?: string;
}

export interface ServiceWithCalculations extends ServiceInput {
    id: string;
    seqNo: number;
    durationMinutes: number;
    billableHours: number;
    grossApp: bigint;
    grossTwr: bigint;
    grossAfis: bigint;
    grossTotal: bigint;
    ppn: bigint;
    netTotal: bigint;
    receiptNo: string;
    receiptDate: Date;
    status: PaymentStatus;
    paidAt?: Date;
    pdfReceiptPath?: string;
    pdfBreakdownPath?: string;
    pdfCombinedPath?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ServiceListItem {
    id: string;
    seqNo: number;
    airline: string;
    flightType: FlightType;
    flightNumber: string;
    registration: string;
    arrivalDate: Date;
    ataUtc: Date;
    advanceExtend: AdvanceExtend;
    durationMinutes: number;
    billableHours: number;
    netTotal: bigint;
    receiptNo: string;
    status: PaymentStatus;
    createdAt: Date;
}

export interface ServiceFilters {
    search?: string;
    flightType?: FlightType;
    status?: PaymentStatus;
    advanceExtend?: AdvanceExtend;
    dateFrom?: Date;
    dateTo?: Date;
}

export interface ServiceSort {
    field: "seqNo" | "ataUtc" | "netTotal" | "durationMinutes" | "createdAt" | "receiptNo";
    direction: "asc" | "desc";
}

export interface ServicesPagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
