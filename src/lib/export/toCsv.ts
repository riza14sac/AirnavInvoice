import Papa from "papaparse";
import { FlightService } from "@prisma/client";
import { formatAsUtc, formatAsWib } from "@/lib/time/tz";

// UTF-8 BOM for Excel compatibility
const UTF8_BOM = "\uFEFF";

/**
 * Export services to CSV in INPUT format (blue columns)
 * This format can be re-imported
 */
export function exportToInputCSV(services: FlightService[]): string {
    const rows = services.map((s) => ({
        airline_operator_gh: s.airline,
        flight_type: s.flightType,
        flight_number: s.flightNumber,
        flight_number_2: s.flightNumber2 || "",
        registration: s.registration,
        aircraft_type: s.aircraftType,
        departure: s.depStation,
        arrival: s.arrStation,
        arrival_date: formatAsUtc(s.arrivalDate, "yyyy-MM-dd"),
        ata_utc: s.ataUtc ? formatAsUtc(s.ataUtc, "HH:mm:ss") : "",
        atd_utc: s.atdUtc ? formatAsUtc(s.atdUtc, "HH:mm:ss") : "",
        service_start_utc: formatAsUtc(s.serviceStartUtc, "HH:mm:ss"),
        service_end_utc: formatAsUtc(s.serviceEndUtc, "HH:mm:ss"),
        advance_extend: s.advanceExtend,
        unit_app: s.useApp ? "1" : "0",
        unit_twr: s.useTwr ? "1" : "0",
        unit_afis: s.useAfis ? "1" : "0",
        pic_dinas: s.picDinas || "",
    }));

    return UTF8_BOM + Papa.unparse(rows);
}

/**
 * Export services to CSV in OUTPUT format (green columns - calculated values)
 */
export function exportToOutputCSV(services: FlightService[]): string {
    const rows = services.map((s) => ({
        seq_no: s.seqNo,
        receipt_no: s.receiptNo,
        receipt_date: formatAsWib(s.receiptDate, "yyyy-MM-dd"),
        airline: s.airline,
        flight_type: s.flightType,
        flight_number: s.flightNumber,
        registration: s.registration,
        aircraft_type: s.aircraftType,
        departure: s.depStation,
        arrival: s.arrStation,
        arrival_date: formatAsWib(s.arrivalDate, "yyyy-MM-dd"),
        ata_wib: s.ataUtc ? formatAsWib(s.ataUtc, "HH:mm:ss") : "",
        ata_utc: s.ataUtc ? formatAsUtc(s.ataUtc, "HH:mm:ss") : "",
        advance_extend: s.advanceExtend,
        service_start_wib: formatAsWib(s.serviceStartUtc, "HH:mm:ss"),
        service_start_utc: formatAsUtc(s.serviceStartUtc, "HH:mm:ss"),
        service_end_wib: formatAsWib(s.serviceEndUtc, "HH:mm:ss"),
        service_end_utc: formatAsUtc(s.serviceEndUtc, "HH:mm:ss"),
        duration_minutes: s.durationMinutes,
        billable_hours: s.billableHours,
        use_app: s.useApp ? "1" : "0",
        use_twr: s.useTwr ? "1" : "0",
        use_afis: s.useAfis ? "1" : "0",
        gross_app: s.grossApp.toString(),
        gross_twr: s.grossTwr.toString(),
        gross_afis: s.grossAfis.toString(),
        gross_total: s.grossTotal.toString(),
        ppn_12: s.ppn.toString(),
        net_total: s.netTotal.toString(),
        status: s.status,
        paid_at: s.paidAt ? formatAsWib(s.paidAt, "yyyy-MM-dd HH:mm:ss") : "",
        pic_dinas: s.picDinas || "",
    }));

    return UTF8_BOM + Papa.unparse(rows);
}

/**
 * Get filename for export
 */
export function getExportFilename(type: "input" | "output", dateRange?: { from?: Date; to?: Date }): string {
    const now = new Date();
    const timestamp = formatAsWib(now, "yyyyMMdd_HHmmss");

    if (dateRange?.from && dateRange?.to) {
        const fromStr = formatAsWib(dateRange.from, "yyyyMMdd");
        const toStr = formatAsWib(dateRange.to, "yyyyMMdd");
        return `airnav_export_${type}_${fromStr}-${toStr}_${timestamp}.csv`;
    }

    return `airnav_export_${type}_${timestamp}.csv`;
}
