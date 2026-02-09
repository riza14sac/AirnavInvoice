import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import PizZip from "pizzip";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { FlightService } from "@prisma/client";
import { formatAsUtc, formatAsWib, formatDuration } from "@/lib/time/tz";
import { formatNumber, numberToWords, type Currency } from "@/lib/time/format";
import { BANK_DETAILS } from "@/lib/config/rates";

const execAsync = promisify(exec);

// LibreOffice path
const LIBREOFFICE_PATH = process.platform === "win32"
    ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
    : "/usr/bin/soffice";

// Template paths
const TEMPLATES_DIR = path.join(process.cwd(), "templates");
const TEMP_DIR = path.join(process.cwd(), "storage", "temp");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Format amount for template based on currency
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
    return new Intl.NumberFormat("id-ID").format(amount);
}

/**
 * Build placeholder data from FlightService
 */
function buildPlaceholderData(
    service: FlightService,
    signerName?: string,
    signatureImageBase64?: string
): Record<string, unknown> {
    const arrivalDate = new Date(service.arrivalDate);
    const receiptDate = new Date(service.receiptDate);
    const ataUtc = service.ataUtc ? new Date(service.ataUtc) : null;
    const atdUtc = service.atdUtc ? new Date(service.atdUtc) : null;
    const serviceStartUtc = new Date(service.serviceStartUtc);
    const serviceEndUtc = new Date(service.serviceEndUtc);

    // Format times
    const ataTimeUtc = ataUtc ? formatAsUtc(ataUtc, "HH:mm:ss") : "";
    const ataTimeWib = ataUtc ? formatAsWib(ataUtc, "HH:mm:ss") : "";
    const atdTimeUtc = atdUtc ? formatAsUtc(atdUtc, "HH:mm:ss") : "";
    const serviceStartTime = formatAsUtc(serviceStartUtc, "HH:mm:ss");
    const serviceEndTime = formatAsUtc(serviceEndUtc, "HH:mm:ss");

    // Duration formatting
    const durationStr = formatDuration(service.durationMinutes);

    // Currency handling
    const currency = (service.currency as Currency) || "IDR";
    const exchangeRate = Number(service.exchangeRate) || 1;

    // Helper to convert IDR amount to display currency (USD if international)
    const convertToDisplayCurrency = (amountIDR: number): number => {
        if (currency === "USD" && exchangeRate > 0) {
            return amountIDR / exchangeRate;
        }
        return amountIDR;
    };

    // Money formatting - convert to display currency first
    const netTotal = convertToDisplayCurrency(Number(service.netTotal));
    const grossTotal = convertToDisplayCurrency(Number(service.grossTotal));
    const ppn = convertToDisplayCurrency(Number(service.ppn));
    const grossApp = convertToDisplayCurrency(Number(service.grossApp));
    const grossTwr = convertToDisplayCurrency(Number(service.grossTwr));
    const grossAfis = convertToDisplayCurrency(Number(service.grossAfis));

    // Receipt number parts
    const receiptNo = service.receiptNo || "";
    const receiptParts = receiptNo.split(".");
    const receiptNoSeq = receiptParts.length > 0 ? receiptParts[receiptParts.length - 1] : "";
    const receiptNoPrefix = receiptNo.replace(receiptNoSeq, "");

    // Terbilang - use currency-aware number to words
    const terbilang = numberToWords(netTotal, currency);

    // Build data object
    const data: Record<string, unknown> = {
        // Flight data
        airline: service.airline || "",
        flightNumber: service.flightNumber || "",
        flightNumber1: service.flightNumber || "",
        flightNumber2: service.flightNumber2 || "",
        registration: service.registration || "",
        aircraftType: service.aircraftType || "",
        depStation: service.depStation || "",
        arrStation: service.arrStation || "",
        route: `${service.depStation}-${service.arrStation}`,
        remark: `${service.depStation}-${service.arrStation}`,
        remark1: `${service.depStation}-${service.arrStation}`,

        // Dates
        arrivalDate: formatAsUtc(arrivalDate, "yyyy-MM-dd"),
        arrivalDateFormatted: formatAsUtc(arrivalDate, "dd MMMM yyyy"),
        receiptDate: formatAsUtc(receiptDate, "dd MMMM yyyy"),
        departureDate: atdUtc ? formatAsUtc(atdUtc, "yyyy-MM-dd") : "",
        departureDateFormatted: atdUtc ? formatAsUtc(atdUtc, "dd MMMM yyyy") : "",

        // Times
        ataTime: ataTimeUtc,
        ataTimeWib: ataTimeWib,
        atdTime: atdTimeUtc,
        atdTimeWib: atdUtc ? formatAsWib(atdUtc, "HH:mm:ss") : "",
        departureTime: atdTimeUtc,
        departureTimeWib: atdUtc ? formatAsWib(atdUtc, "HH:mm:ss") : "",
        serviceStart: serviceStartTime,
        serviceEnd: serviceEndTime,
        duration: durationStr,
        durationMinutes: String(service.durationMinutes),
        billableHours: service.billableHours.toFixed(2),

        // Money - format based on currency
        rate: formatAmountForTemplate(grossTotal, currency),
        grossApp: formatAmountForTemplate(grossApp, currency),
        grossTwr: formatAmountForTemplate(grossTwr, currency),
        grossAfis: formatAmountForTemplate(grossAfis, currency),
        grossTotal: formatAmountForTemplate(grossTotal, currency),
        ppn: formatAmountForTemplate(ppn, currency),
        netTotal: formatAmountForTemplate(netTotal, currency),
        total: formatAmountForTemplate(netTotal, currency),
        terbilang: terbilang,

        // Document numbers
        seqNo: String(service.seqNo).padStart(4, "0"),
        receiptNo: receiptNo,
        receiptNoPrefix: receiptNoPrefix,
        receiptNoSeq: receiptNoSeq,

        // Other
        advanceExtend: service.advanceExtend || "",
        AdvancedExtend: service.advanceExtend || "", // Alternative placeholder name
        flightType: service.flightType || "",
        kurs: currency === "USD" && Number(service.exchangeRate) > 0
            ? new Intl.NumberFormat("id-ID").format(Number(service.exchangeRate))
            : "",
        KursTerkini: currency === "USD" && Number(service.exchangeRate) > 0
            ? new Intl.NumberFormat("id-ID").format(Number(service.exchangeRate))
            : "",
        picDinas: service.picDinas || "",

        // Signer
        signerName: signerName || "",
        signerTitle: "Manager",

        // Bank
        bankName: BANK_DETAILS.bankName,
        bankAccount: BANK_DETAILS.accountNumber,
        bankHolder: BANK_DETAILS.accountName,
    };

    // Add signature image if available (base64 string for image module)
    if (signatureImageBase64) {
        // Remove data URL prefix if present
        const base64Data = signatureImageBase64.replace(/^data:image\/\w+;base64,/, "");
        data.signatureImage = base64Data;
    }

    return data;
}

/**
 * Create image module for docxtemplater
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
 * Process Word template and replace placeholders
 */
export async function processWordTemplate(
    templateName: string,
    service: FlightService,
    signerName?: string,
    signatureImageData?: string
): Promise<Buffer> {
    const templatePath = path.join(TEMPLATES_DIR, templateName);

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }

    // Read template
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    // Create image module
    const imageModule = createImageModule();

    // Create docxtemplater instance with image module
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{", end: "}" },
        modules: [imageModule],
    });

    // Build data
    const data = buildPlaceholderData(service, signerName, signatureImageData);

    // Render document
    doc.render(data);

    // Generate output
    const buf = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
    });

    return buf;
}

/**
 * Convert Word document to PDF using LibreOffice
 */
export async function convertWordToPdf(wordBuffer: Buffer, outputName: string): Promise<Buffer> {
    // Create temp file
    const tempDocxPath = path.join(TEMP_DIR, `${outputName}_${Date.now()}.docx`);
    const tempPdfPath = tempDocxPath.replace(".docx", ".pdf");

    try {
        // Write Word buffer to temp file
        fs.writeFileSync(tempDocxPath, wordBuffer);

        // Convert using LibreOffice
        const command = `"${LIBREOFFICE_PATH}" --headless --convert-to pdf --outdir "${TEMP_DIR}" "${tempDocxPath}"`;

        await execAsync(command, { timeout: 60000 });

        // Read generated PDF
        if (!fs.existsSync(tempPdfPath)) {
            throw new Error("PDF conversion failed - output file not found");
        }

        const pdfBuffer = fs.readFileSync(tempPdfPath);

        return pdfBuffer;
    } finally {
        // Cleanup temp files
        try {
            if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
            if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

/**
 * Generate PDF from Word template
 */
export async function generatePdfFromWordTemplate(
    templateName: string,
    service: FlightService,
    signerName?: string,
    signatureImageData?: string
): Promise<Buffer> {
    // Process template
    const wordBuffer = await processWordTemplate(templateName, service, signerName, signatureImageData);

    // Convert to PDF
    const pdfBuffer = await convertWordToPdf(wordBuffer, `service_${service.id}`);

    return pdfBuffer;
}

/**
 * Generate filled Word document (without PDF conversion)
 */
export async function generateWordFromTemplate(
    templateName: string,
    service: FlightService,
    signerName?: string,
    signatureImageData?: string
): Promise<Buffer> {
    return processWordTemplate(templateName, service, signerName, signatureImageData);
}
