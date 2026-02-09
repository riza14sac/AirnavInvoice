import { format, parseISO } from "date-fns";

export type Currency = "IDR" | "USD";

/**
 * Format number as Indonesian Rupiah
 */
export function formatRupiah(amount: number | bigint): string {
    const num = typeof amount === "bigint" ? Number(amount) : amount;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/**
 * Format number as currency (IDR or USD)
 * For IDR: "Rp 1.234.567"
 * For USD: "$ 1,234.56"
 */
export function formatMoney(amount: number | bigint, currency: Currency = "IDR"): string {
    const num = typeof amount === "bigint" ? Number(amount) : amount;

    if (currency === "USD") {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/**
 * Format number with thousand separators (Indonesian style)
 */
export function formatNumber(num: number | bigint): string {
    const n = typeof num === "bigint" ? Number(num) : num;
    return new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Convert number to words in Indonesian (for terbilang)
 */
export function numberToWordsID(num: number): string {
    if (num === 0) return "Nol Rupiah";

    const units = [
        "",
        "Satu",
        "Dua",
        "Tiga",
        "Empat",
        "Lima",
        "Enam",
        "Tujuh",
        "Delapan",
        "Sembilan",
        "Sepuluh",
        "Sebelas",
    ];

    const convertLessThanThousand = (n: number): string => {
        if (n === 0) return "";
        if (n < 12) return units[n];
        if (n < 20) return units[n - 10] + " Belas";
        if (n < 100) {
            const tens = Math.floor(n / 10);
            const remainder = n % 10;
            return units[tens] + " Puluh" + (remainder > 0 ? " " + units[remainder] : "");
        }
        const hundreds = Math.floor(n / 100);
        const remainder = n % 100;
        const prefix = hundreds === 1 ? "Seratus" : units[hundreds] + " Ratus";
        return prefix + (remainder > 0 ? " " + convertLessThanThousand(remainder) : "");
    };

    const convert = (n: number): string => {
        if (n === 0) return "";
        if (n < 1000) return convertLessThanThousand(n);
        if (n < 1000000) {
            const thousands = Math.floor(n / 1000);
            const remainder = n % 1000;
            const prefix = thousands === 1 ? "Seribu" : convertLessThanThousand(thousands) + " Ribu";
            return prefix + (remainder > 0 ? " " + convertLessThanThousand(remainder) : "");
        }
        if (n < 1000000000) {
            const millions = Math.floor(n / 1000000);
            const remainder = n % 1000000;
            return (
                convertLessThanThousand(millions) +
                " Juta" +
                (remainder > 0 ? " " + convert(remainder) : "")
            );
        }
        if (n < 1000000000000) {
            const billions = Math.floor(n / 1000000000);
            const remainder = n % 1000000000;
            return (
                convertLessThanThousand(billions) +
                " Miliar" +
                (remainder > 0 ? " " + convert(remainder) : "")
            );
        }
        const trillions = Math.floor(n / 1000000000000);
        const remainder = n % 1000000000000;
        return (
            convertLessThanThousand(trillions) +
            " Triliun" +
            (remainder > 0 ? " " + convert(remainder) : "")
        );
    };

    return convert(Math.abs(num)) + " Rupiah";
}

/**
 * Convert number to words in English (for USD amounts)
 */
export function numberToWordsEN(num: number): string {
    if (num === 0) return "Zero Dollars";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertLessThanThousand = (n: number): string => {
        if (n === 0) return "";
        if (n < 20) return ones[n];
        if (n < 100) {
            const t = Math.floor(n / 10);
            const o = n % 10;
            return tens[t] + (o > 0 ? " " + ones[o] : "");
        }
        const h = Math.floor(n / 100);
        const remainder = n % 100;
        return ones[h] + " Hundred" + (remainder > 0 ? " " + convertLessThanThousand(remainder) : "");
    };

    const convert = (n: number): string => {
        if (n === 0) return "";
        if (n < 1000) return convertLessThanThousand(n);
        if (n < 1000000) {
            const thousands = Math.floor(n / 1000);
            const remainder = n % 1000;
            return convertLessThanThousand(thousands) + " Thousand" + (remainder > 0 ? " " + convertLessThanThousand(remainder) : "");
        }
        if (n < 1000000000) {
            const millions = Math.floor(n / 1000000);
            const remainder = n % 1000000;
            return convertLessThanThousand(millions) + " Million" + (remainder > 0 ? " " + convert(remainder) : "");
        }
        const billions = Math.floor(n / 1000000000);
        const remainder = n % 1000000000;
        return convertLessThanThousand(billions) + " Billion" + (remainder > 0 ? " " + convert(remainder) : "");
    };

    // Handle cents for USD
    const dollars = Math.floor(Math.abs(num));
    const cents = Math.round((Math.abs(num) - dollars) * 100);

    let result = convert(dollars) + " Dollar" + (dollars !== 1 ? "s" : "");
    if (cents > 0) {
        result += " and " + convert(cents) + " Cent" + (cents !== 1 ? "s" : "");
    }
    return result;
}

/**
 * Convert number to words based on currency
 * For IDR: Indonesian words + "Rupiah"
 * For USD: English words + "Dollars"
 */
export function numberToWords(num: number, currency: Currency = "IDR"): string {
    if (currency === "USD") {
        return numberToWordsEN(num);
    }
    return numberToWordsID(num);
}

/**
 * Format date for file names (YYYYMMDD)
 */
export function formatDateForFilename(date: Date): string {
    return format(date, "yyyyMMdd");
}

/**
 * Pad a number with leading zeros
 */
export function padNumber(num: number, length: number): string {
    return num.toString().padStart(length, "0");
}
