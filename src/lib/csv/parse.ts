import Papa from "papaparse";
import { CSV_HEADER_ALIASES, ImportRowData, importRowSchema } from "@/validators/import.schema";

/**
 * Normalize a header name to match our expected format
 */
export function normalizeHeader(header: string): string {
    const normalized = header.toLowerCase().trim().replace(/\s+/g, "_");

    // Check if it's already a known field
    if (Object.keys(CSV_HEADER_ALIASES).includes(normalized)) {
        return normalized;
    }

    // Check aliases
    for (const [standard, aliases] of Object.entries(CSV_HEADER_ALIASES)) {
        if (aliases.includes(normalized)) {
            return standard;
        }
    }

    return normalized;
}

/**
 * Parse CSV content and return rows with normalized headers
 */
export function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
    const result = Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
    });

    return {
        headers: result.meta.fields || [],
        rows: result.data,
    };
}

/**
 * Validate a single row against the import schema
 */
export function validateRow(row: Record<string, string>, rowNumber: number): {
    isValid: boolean;
    data?: ImportRowData;
    errors: string[];
} {
    try {
        const data = importRowSchema.parse(row);
        return { isValid: true, data, errors: [] };
    } catch (error) {
        if (error instanceof Error && "issues" in error) {
            const zodError = error as { issues: Array<{ path: string[]; message: string }> };
            const errors = zodError.issues.map(
                (issue) => `${issue.path.join(".")}: ${issue.message}`
            );
            return { isValid: false, errors };
        }
        return { isValid: false, errors: [`Row ${rowNumber}: Unknown validation error`] };
    }
}

/**
 * Parse boolean-like values from CSV
 */
export function parseBoolean(value: string | number | boolean | undefined): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
    }
    return false;
}
