/**
 * Exchange Rate Utility
 * Fetches USD to IDR exchange rate from an API
 */

// Cache for exchange rate (valid for 1 hour)
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get current USD to IDR exchange rate
 * Uses Bank Indonesia or fallback to free API
 */
export async function getUsdToIdrRate(): Promise<number> {
    // Return cached rate if still valid
    if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
        return cachedRate.rate;
    }

    try {
        // Try ExchangeRate-API (free tier)
        const response = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
            { next: { revalidate: 3600 } } // Cache for 1 hour
        );

        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }

        const data = await response.json();
        const rate = data.rates?.IDR;

        if (typeof rate !== "number" || isNaN(rate)) {
            throw new Error("Invalid rate received");
        }

        // Update cache
        cachedRate = { rate, timestamp: Date.now() };
        return rate;
    } catch (error) {
        console.error("Failed to fetch exchange rate:", error);

        // Return cached rate if available (even if expired)
        if (cachedRate) {
            return cachedRate.rate;
        }

        // Fallback to a reasonable default rate
        return 16000;
    }
}

/**
 * Format currency with proper symbol
 */
export function formatCurrency(amount: number, currency: "IDR" | "USD"): string {
    if (currency === "USD") {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Convert USD to IDR
 */
export async function convertUsdToIdr(amountUsd: number): Promise<number> {
    const rate = await getUsdToIdrRate();
    return Math.round(amountUsd * rate);
}
