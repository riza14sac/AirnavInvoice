import { z } from "zod";

// Schema for a single row in CSV import
export const importRowSchema = z.object({
    airline_operator_gh: z.string().min(1, "Airline is required"),
    flight_type: z.enum(["DOM", "INT"]),
    flight_number: z.string().min(1, "Flight number is required"),
    flight_number_2: z.string().optional(),
    registration: z.string().min(1, "Registration is required"),
    aircraft_type: z.string().min(1, "Aircraft type is required"),
    departure: z.string().min(1, "Departure station is required"),
    arrival: z.string().min(1, "Arrival station is required"),
    arrival_date: z.string().min(1, "Arrival date is required"),
    ata_utc: z.string().min(1, "ATA is required"),
    atd_utc: z.string().optional(),
    service_start_utc: z.string().min(1, "Service start is required"),
    service_end_utc: z.string().min(1, "Service end is required"),
    advance_extend: z.enum(["ADVANCE", "EXTEND"]),
    unit_app: z.union([z.literal("1"), z.literal("0"), z.literal(1), z.literal(0), z.boolean()]),
    unit_twr: z.union([z.literal("1"), z.literal("0"), z.literal(1), z.literal(0), z.boolean()]),
    unit_afis: z.union([z.literal("1"), z.literal("0"), z.literal(1), z.literal(0), z.boolean()]),
    pic_dinas: z.string().optional(),
});

export type ImportRowData = z.infer<typeof importRowSchema>;

// Header mapping for flexible CSV import
export const CSV_HEADER_ALIASES: Record<string, string[]> = {
    airline_operator_gh: ["airline", "operator", "gh", "ground_handling", "airline_operator"],
    flight_type: ["type", "dom_int", "domestic_international"],
    flight_number: ["flight_no", "flt_no", "flight"],
    flight_number_2: ["flight_no_2", "flt_no_2", "flight2"],
    registration: ["reg", "aircraft_reg", "tail_number"],
    aircraft_type: ["acft_type", "type_aircraft", "aircraft"],
    departure: ["dep", "dep_station", "origin", "from"],
    arrival: ["arr", "arr_station", "destination", "to"],
    arrival_date: ["arr_date", "date_arrival", "date"],
    ata_utc: ["ata", "arrival_time", "time_arrival"],
    atd_utc: ["atd", "departure_time", "time_departure"],
    service_start_utc: ["start", "start_time", "service_start"],
    service_end_utc: ["end", "end_time", "service_end"],
    advance_extend: ["adv_ext", "type_charge"],
    unit_app: ["app", "use_app"],
    unit_twr: ["twr", "use_twr"],
    unit_afis: ["afis", "use_afis"],
    pic_dinas: ["pic", "officer", "petugas"],
};

export interface ImportPreviewRow extends ImportRowData {
    rowNumber: number;
    isValid: boolean;
    errors: string[];
}

export interface ImportResult {
    success: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    importedCount: number;
    errors: Array<{ row: number; message: string }>;
}
