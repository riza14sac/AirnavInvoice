import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { TIMEZONE_WIB, TIMEZONE_UTC } from "@/lib/config/constants";

/**
 * Convert a UTC date to WIB timezone
 */
export function utcToWib(date: Date | string): Date {
    const d = typeof date === "string" ? parseISO(date) : date;
    return toZonedTime(d, TIMEZONE_WIB);
}

/**
 * Convert a WIB date to UTC
 */
export function wibToUtc(date: Date | string): Date {
    const d = typeof date === "string" ? parseISO(date) : date;
    return fromZonedTime(d, TIMEZONE_WIB);
}

/**
 * Format a UTC date as WIB string
 */
export function formatAsWib(date: Date | string, formatStr: string): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatInTimeZone(d, TIMEZONE_WIB, formatStr);
}

/**
 * Format a UTC date as UTC string
 */
export function formatAsUtc(date: Date | string, formatStr: string): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatInTimeZone(d, TIMEZONE_UTC, formatStr);
}

/**
 * Get year and month from a UTC date in WIB timezone
 * Used for receipt number generation
 */
export function getWibYearMonth(dateUtc: Date): { year: number; month: number } {
    const wibDate = utcToWib(dateUtc);
    return {
        year: wibDate.getFullYear(),
        month: wibDate.getMonth() + 1, // 1-indexed
    };
}

/**
 * Format duration in minutes to HH:MM:SS string
 */
export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:00`;
}

/**
 * Format time as HH:MM:SS
 */
export function formatTimeHMS(date: Date | string): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "HH:mm:ss");
}

/**
 * Parse a time string (HH:MM or HH:MM:SS) and combine with a date
 */
export function parseTimeWithDate(timeStr: string, dateStr: string): Date {
    const parts = timeStr.split(":").map(Number);
    const date = parseISO(dateStr);
    date.setUTCHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
    return date;
}

/**
 * Get current date in WIB
 */
export function nowWib(): Date {
    return utcToWib(new Date());
}

/**
 * Format date for display (e.g., "24 December 2025")
 */
export function formatDisplayDate(date: Date | string): string {
    return formatAsWib(date, "dd MMMM yyyy");
}

/**
 * Format date for display with time (e.g., "24 Dec 2025 19:05 WIB")
 */
export function formatDisplayDateTime(date: Date | string): string {
    return formatAsWib(date, "dd MMM yyyy HH:mm") + " WIB";
}
