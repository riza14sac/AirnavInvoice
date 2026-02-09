import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import PizZip from "pizzip";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { FlightService } from "@prisma/client";
import { formatAsWib, formatAsUtc, formatDuration } from "@/lib/time/tz";
import { formatNumber, numberToWords, type Currency } from "@/lib/time/format";
import { BANK_DETAILS } from "@/lib/config/rates";
import os from "os";
import { PDFDocument } from "pdf-lib";

const execAsync = promisify(exec);

export type PdfPageType = "breakdown" | "receipt" | "combined";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

/**
 * Get template path based on currency
 */
function getTemplatePath(currency: string): string {
    const templateName = currency === "USD"
        ? "Template_Placeholder_USD.docx"
        : "Template_Placeholder_IDR.docx";
    return path.join(TEMPLATES_DIR, templateName);
}

// Detect LibreOffice path based on OS
function getLibreOfficePath(): string {
    if (process.platform === "win32") {
        return "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
    } else {
        // Linux/Mac - use soffice from PATH or common locations
        return "/usr/bin/soffice";
    }
}

const LIBREOFFICE_PATH = getLibreOfficePath();

/**
 * Convert number to Indonesian words (terbilang)
 */
function numberToWordsID(num: number): string {
    const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

    if (num === 0) return "Nol";
    if (num < 12) return satuan[num];
    if (num < 20) return satuan[num - 10] + " Belas";
    if (num < 100) return satuan[Math.floor(num / 10)] + " Puluh " + numberToWordsID(num % 10);
    if (num < 200) return "Seratus " + numberToWordsID(num - 100);
    if (num < 1000) return satuan[Math.floor(num / 100)] + " Ratus " + numberToWordsID(num % 100);
    if (num < 2000) return "Seribu " + numberToWordsID(num - 1000);
    if (num < 1000000) return numberToWordsID(Math.floor(num / 1000)) + " Ribu " + numberToWordsID(num % 1000);
    if (num < 1000000000) return numberToWordsID(Math.floor(num / 1000000)) + " Juta " + numberToWordsID(num % 1000000);
    return numberToWordsID(Math.floor(num / 1000000000)) + " Milyar " + numberToWordsID(num % 1000000000);
}

/**
 * Format amount for template without currency symbol
 * IDR: "1.234.567" (Indonesian format)
 * USD: "1,234.56" (US format with 2 decimals)
 */
function formatAmountForTemplate(amount: number, currency: Currency = "IDR"): string {
    if (currency === "USD") {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }
    return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Build placeholder data from FlightService
 */
export function buildPlaceholderData(
    service: FlightService,
    signerName?: string,
    signatureImageBase64?: string
): Record<string, unknown> {
    // Split receipt number: WITT.21.2025.12.0208 -> prefix "WITT.21.2025.12." + seq "0208"
    const receiptParts = service.receiptNo.split(".");
    const receiptSeq = receiptParts.pop() || "";
    const receiptPrefix = receiptParts.join(".") + ".";

    // Format dates - only show one based on whether ATD exists
    const receiptDateFormatted = formatAsWib(service.receiptDate, "dd MMMM yyyy");

    // Logic: If ATD exists, this is a Departure record; otherwise Arrival record
    // Only one of the dates will be displayed in the invoice
    const isArrivalType = !!service.ataUtc && !service.atdUtc;
    const arrivalDate = isArrivalType && service.ataUtc ? formatAsWib(service.arrivalDate, "yyyy-MM-dd") : "";
    const arrivalTime = isArrivalType && service.ataUtc ? formatAsUtc(service.ataUtc, "HH:mm:ss") : "";
    const departureDate = !isArrivalType && service.atdUtc ? formatAsWib(service.atdUtc, "yyyy-MM-dd") : "";
    const departureTime = !isArrivalType && service.atdUtc ? formatAsUtc(service.atdUtc, "HH:mm:ss") : "";

    // Format times (UTC)
    const ataTime = service.ataUtc ? formatAsUtc(service.ataUtc, "HH:mm:ss") : "";
    const atdTime = service.atdUtc ? formatAsUtc(service.atdUtc, "HH:mm:ss") : "";
    const serviceStart = formatAsUtc(service.serviceStartUtc, "HH:mm:ss");
    const serviceEnd = formatAsUtc(service.serviceEndUtc, "HH:mm:ss");
    const duration = formatDuration(service.durationMinutes);

    // Calculate rate based on service type
    let rateIDR = BigInt(0);
    if (service.useApp) rateIDR = service.grossApp;
    else if (service.useTwr) rateIDR = service.grossTwr;
    else if (service.useAfis) rateIDR = service.grossAfis;

    // Get currency for display
    const currency = (service.currency || "IDR") as Currency;

    // Helper to convert IDR amount to display currency (USD if international)
    const convertToDisplayCurrency = (amountIDR: bigint): number => {
        const amount = Number(amountIDR);
        if (currency === "USD" && service.exchangeRate && service.exchangeRate > 0) {
            return amount / service.exchangeRate;
        }
        return amount;
    };

    // Convert all amounts to display currency
    const rate = convertToDisplayCurrency(rateIDR);
    const grossTotal = convertToDisplayCurrency(service.grossTotal);
    const ppn = convertToDisplayCurrency(service.ppn);
    const netTotal = convertToDisplayCurrency(service.netTotal);

    // Terbilang - use converted value
    const terbilang = numberToWords(netTotal, currency);

    const data: Record<string, unknown> = {
        // Receipt header
        receiptNoPrefix: receiptPrefix,
        receiptNoSeq: receiptSeq,
        receiptDate: receiptDateFormatted,

        // Airline info
        airline: service.airline,
        groundHandling: service.airline,

        // Flight info
        flightNumber1: service.flightNumber,
        flightNumber2: service.flightNumber2 || "",
        registration: service.registration,
        aircraftType: service.aircraftType,

        // Locations
        depStation: service.depStation,
        arrStation: service.arrStation,
        depStation2: "",
        arrStation2: "",
        route: `${service.depStation}-${service.arrStation}`,
        remark1: `${service.depStation}-${service.arrStation}`,
        remark2: "",

        // Dates and times - only one of arrival/departure will have values
        arrivalDate: arrivalDate,
        arrivalTime: arrivalTime,
        departureDate: departureDate,
        departureTime: departureTime,
        ataTime: arrivalTime || ataTime, // Use conditional time if available
        atdTime: departureTime || atdTime, // Use conditional time if available
        serviceStart: serviceStart,
        serviceEnd: serviceEnd,
        duration: duration,

        // Payment
        paidBy: service.airline,
        advanceExtend: service.advanceExtend,
        AdvancedExtend: service.advanceExtend, // Alternative placeholder name

        // Amounts - currency aware, NO currency symbol (template has it)
        rate: formatAmountForTemplate(rate, currency),
        grossTotal: formatAmountForTemplate(grossTotal, currency),
        ppn: formatAmountForTemplate(ppn, currency),
        netTotal: formatAmountForTemplate(netTotal, currency),
        pph23: "-",
        total: formatAmountForTemplate(netTotal, currency),
        terbilang: terbilang,
        currency: service.currency || "IDR",
        kurs: service.currency === "USD" && service.exchangeRate && service.exchangeRate > 0
            ? formatNumber(service.exchangeRate)
            : "",
        KursTerkini: service.currency === "USD" && service.exchangeRate && service.exchangeRate > 0
            ? formatNumber(service.exchangeRate)
            : "",

        // Bank details
        bankName: BANK_DETAILS.bankName,
        bankBranch: BANK_DETAILS.branchName,
        accountName: BANK_DETAILS.accountName,
        accountNumber: BANK_DETAILS.accountNumber,

        // Signature
        signerName: signerName || "PIC DINAS",
    };

    // Add signature image if available
    if (signatureImageBase64) {
        // Remove data URL prefix if present
        const base64Data = signatureImageBase64.replace(/^data:image\/\w+;base64,/, "");
        data.signatureImage = base64Data;
    }

    return data;
}

/**
 * Create image module options
 */
function createImageModule() {
    const imageOptions = {
        centered: false,
        getImage: (tagValue: string) => {
            // tagValue is base64 encoded image
            return Buffer.from(tagValue, "base64");
        },
        getSize: () => {
            // Return [width, height] in pixels
            return [150, 60]; // Signature size
        },
    };
    return new ImageModule(imageOptions);
}

/**
 * Generate filled Word document from template
 */
export async function generateWordFromTemplate(
    service: FlightService,
    signerName?: string,
    signatureImageBase64?: string
): Promise<Buffer> {
    // Get template path based on service currency
    const templatePath = getTemplatePath(service.currency || "IDR");

    // Read template
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    // Create document with image module
    const imageModule = createImageModule();
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
    });

    // Build data
    const data = buildPlaceholderData(service, signerName, signatureImageBase64);

    // Render
    doc.render(data);

    // Generate output
    const buf = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
    });

    return buf;
}

/**
 * Generate PDF from Word template using LibreOffice
 * @param service - Flight service data
 * @param signerName - Name of the signer
 * @param signatureImageBase64 - Base64 encoded signature image
 * @param pageType - Which page(s) to include: breakdown (page 1), receipt (page 2), or combined (both)
 */
export async function generatePdfFromWordTemplate(
    service: FlightService,
    signerName?: string,
    signatureImageBase64?: string,
    pageType: PdfPageType = "combined"
): Promise<Buffer> {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `airnav-pdf-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const tempDocxPath = path.join(tempDir, "document.docx");
    const tempPdfPath = path.join(tempDir, "document.pdf");

    try {
        // Generate filled Word document
        const wordBuffer = await generateWordFromTemplate(service, signerName, signatureImageBase64);
        fs.writeFileSync(tempDocxPath, wordBuffer);

        // Convert to PDF using LibreOffice
        const command = `"${LIBREOFFICE_PATH}" --headless --convert-to pdf --outdir "${tempDir}" "${tempDocxPath}"`;
        await execAsync(command);

        // Read PDF
        if (!fs.existsSync(tempPdfPath)) {
            throw new Error("PDF conversion failed - output file not found");
        }
        const fullPdfBuffer = fs.readFileSync(tempPdfPath);

        // If combined, return the full PDF
        if (pageType === "combined") {
            return fullPdfBuffer;
        }

        // Extract specific page(s) based on pageType
        const srcDoc = await PDFDocument.load(fullPdfBuffer);
        const pageCount = srcDoc.getPageCount();

        // Create a new document with only the requested page(s)
        const newDoc = await PDFDocument.create();

        if (pageType === "breakdown" && pageCount >= 1) {
            // Breakdown = Page 1 only (index 0)
            const [page1] = await newDoc.copyPages(srcDoc, [0]);
            newDoc.addPage(page1);
        } else if (pageType === "receipt" && pageCount >= 2) {
            // Receipt = Page 2 only (index 1)
            const [page2] = await newDoc.copyPages(srcDoc, [1]);
            newDoc.addPage(page2);
        } else {
            // Fallback: return full PDF if page doesn't exist
            return fullPdfBuffer;
        }

        const extractedPdfBytes = await newDoc.save();
        return Buffer.from(extractedPdfBytes);
    } finally {
        // Cleanup temp files
        try {
            if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
            if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
            if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
        } catch {
            // Ignore cleanup errors
        }
    }
}
