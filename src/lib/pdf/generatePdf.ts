import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFFont,
  PDFPage,
  PDFImage,
} from "pdf-lib";
import { FlightService } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

import { formatAsUtc, formatDuration, formatAsWib } from "@/lib/time/tz";
import { formatNumber, numberToWordsID } from "@/lib/time/format";
import { BANK_DETAILS } from "@/lib/config/rates";

const STORAGE_DIR = path.join(process.cwd(), "storage", "pdf");
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 595.28;
const PAGE_H = 841.89;

// -----------------------------
// Utils
// -----------------------------
function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function stripCurrency(text: string): string {
  return s(text)
    .replace(/Rp/gi, "")
    .replace(/\$/g, "")
    .replace(/[^\d.,-]/g, "")
    .trim();
}

/**
 * Format amount for PDF without currency symbol
 * IDR: "1.234.567" (Indonesian format)
 * USD: "1,234.56" (US format with 2 decimals)
 */
function formatAmountForPdf(amount: number, currency: string = "IDR"): string {
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

function toNumberSafe(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    // Strip currency symbols and non-numeric characters except . and -
    const cleaned = v.replace(/[Rp$,\s]/gi, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  // prisma Decimal-like
  // @ts-ignore
  if (v && typeof v.toString === "function") {
    // @ts-ignore
    const cleaned = v.toString().replace(/[Rp$,\s]/gi, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Convert "top-y" (fitz/pdf top-left coordinate) to pdf-lib baseline y (bottom-left origin) */
function yFromTop(topY: number, fontSize: number): number {
  // place text using "top" reference: baseline = PAGE_H - topY - fontSize
  return PAGE_H - topY - fontSize;
}

function rectFromTop(x0: number, y0Top: number, x1: number, y1Top: number) {
  // fitz rect uses top-left origin. pdf-lib uses bottom-left.
  // y in pdf-lib should be bottom = PAGE_H - y1Top
  return {
    x: x0,
    y: PAGE_H - y1Top,
    width: x1 - x0,
    height: y1Top - y0Top,
  };
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const t = s(text);
  if (!t) return "";
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;

  const ell = "…";
  let lo = 0;
  let hi = t.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cand = t.slice(0, mid).trimEnd() + ell;
    if (font.widthOfTextAtSize(cand, size) <= maxWidth) lo = mid + 1;
    else hi = mid;
  }
  const cut = Math.max(0, lo - 1);
  return t.slice(0, cut).trimEnd() + ell;
}

function drawText(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont) {
  page.drawText(s(text), { x, y, size, font, color: BLACK });
}

function drawTextFit(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont, maxWidth: number) {
  const t = fitText(text, font, size, maxWidth);
  page.drawText(t, { x, y, size, font, color: BLACK });
}

function drawLine(page: PDFPage, x0: number, y0: number, x1: number, y1: number, thickness = 0.6) {
  page.drawLine({
    start: { x: x0, y: y0 },
    end: { x: x1, y: y1 },
    thickness,
    color: BLACK,
  });
}

function drawThinRect(page: PDFPage, x: number, y: number, width: number, height: number) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: BLACK,
  });
}

async function tryEmbedPng(pdfDoc: PDFDocument, absPath: string): Promise<PDFImage | null> {
  try {
    const bytes = await fs.readFile(absPath);
    return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

function splitReceiptNo(no: string): { left: string; right: string } {
  const t = s(no).trim();
  // match: "WITT.21.2025.12. 0208" or "WITT.21.2025.12.0208"
  const m = t.match(/^(.*\.)\s*([0-9]{3,6})$/);
  if (!m) return { left: t, right: "" };
  return { left: m[1], right: m[2] };
}

function formatEnWibDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatIsoDateWib(d: Date | string | null | undefined): string {
  if (!d) return "";
  // use your helper if you want exact like "2025-12-13"
  return formatAsWib(d as any, "yyyy-MM-dd");
}

// -----------------------------
// Fonts (match Excel export)
// -----------------------------
async function loadFonts(pdfDoc: PDFDocument): Promise<{
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}> {
  // Try Calibri from public/fonts (recommended)
  const candidates = [
    {
      regular: path.join(process.cwd(), "public", "fonts", "Calibri.ttf"),
      bold: path.join(process.cwd(), "public", "fonts", "Calibri-Bold.ttf"),
      italic: path.join(process.cwd(), "public", "fonts", "Calibri-Italic.ttf"),
      boldItalic: path.join(process.cwd(), "public", "fonts", "Calibri-BoldItalic.ttf"),
    },
    // common alternate names
    {
      regular: path.join(process.cwd(), "public", "fonts", "calibri.ttf"),
      bold: path.join(process.cwd(), "public", "fonts", "calibri-bold.ttf"),
      italic: path.join(process.cwd(), "public", "fonts", "calibri-italic.ttf"),
      boldItalic: path.join(process.cwd(), "public", "fonts", "calibri-bolditalic.ttf"),
    },
  ];

  for (const c of candidates) {
    try {
      const [r, b, i, bi] = await Promise.all([
        fs.readFile(c.regular),
        fs.readFile(c.bold),
        fs.readFile(c.italic),
        fs.readFile(c.boldItalic),
      ]);
      return {
        regular: await pdfDoc.embedFont(r),
        bold: await pdfDoc.embedFont(b),
        italic: await pdfDoc.embedFont(i),
        boldItalic: await pdfDoc.embedFont(bi),
      };
    } catch {
      // continue
    }
  }

  // Fallback Helvetica
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
}

// ============================================================
// LAMPIRAN 1 (Breakdown) — fixed coordinates from your PDF
// ============================================================
export async function generateBreakdownPdf(service: FlightService): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const { regular, bold, italic } = await loadFonts(pdfDoc);

  // ---------- Assets ----------
  const logo = await tryEmbedPng(pdfDoc, path.join(process.cwd(), "public", "logos", "airnav.png"));
  const signature = await tryEmbedPng(pdfDoc, path.join(process.cwd(), "public", "signatures", "widya_anggriani.png"));

  // ---------- Header (measured from PDF page 1) ----------
  // Logo rect: Rect(33.0, 50.64, 185.16, 99.0)
  if (logo) {
    const r = rectFromTop(33.0, 50.64, 185.16, 99.0);
    page.drawImage(logo, r);
  }

  const receiptNo = splitReceiptNo(s((service as any).receiptNo));
  const dateStr = formatEnWibDate((service as any).receiptDate);

  // "NO" at x=338.40 yTop=76.32 size=6.72
  drawText(page, "NO", 338.40, yFromTop(76.32, 6.72), 6.72, regular);
  drawText(page, ":", 438.96, yFromTop(76.32, 6.72), 6.72, regular);
  drawText(page, receiptNo.left, 443.04, yFromTop(76.32, 6.72), 6.72, regular);
  if (receiptNo.right) drawText(page, receiptNo.right, 508.44, yFromTop(76.32, 6.72), 6.72, regular);

  drawText(page, "TANGGAL/DATE", 338.40, yFromTop(85.08, 6.72), 6.72, regular);
  drawText(page, ":", 438.96, yFromTop(85.08, 6.72), 6.72, regular);
  drawText(page, dateStr, 443.04, yFromTop(85.08, 6.72), 6.72, regular);

  // ---------- Titles ----------
  // "AIRNAV INDONESIA" x=245.04 yTop=120.96 size=13.44 bold
  drawText(page, "AIRNAV INDONESIA", 245.04, yFromTop(120.96, 13.44), 13.44, bold);

  // Subtitle yTop=136.35 size=7.32 bold (centered in template)
  drawText(
    page,
    "PERUM LEMBAGA PENYELENGGARA PELAYANAN NAVIGASI PENERBANGAN INDONESIA",
    167.64,
    yFromTop(136.35, 7.32),
    7.32,
    bold
  );

  // Charges yTop=145.47 size=7.32 bold
  drawText(page, "ADVANCED/EXTENDED CHARGES", 250.32, yFromTop(145.47, 7.32), 7.32, bold);

  // Horizontal separator line (thin rect): x0=31.44 y0=161.76 x1=569.16 y1=162.36
  {
    const r = rectFromTop(31.44, 161.76, 569.16, 162.36);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }

  // ---------- Detail block columns ----------
  const labelX = 32.64;
  const colonX = 222.12;
  const valueX = 228.00;

  const MAX_VAL_W = 280; // safe width before Location/Remark area

  // Row yTop from template
  const FS = 6.72;

  // AIRLINE
  drawText(page, "AIRLINE/", labelX, yFromTop(174.96, FS), FS, regular);
  drawText(page, "Airline", 56.52, yFromTop(174.96, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(174.96, FS), FS, regular);
  drawTextFit(page, s((service as any).airline), valueX, yFromTop(174.72, FS), FS, regular, MAX_VAL_W);

  // GROUND HANDLING
  drawText(page, "GROUND HANDLING", labelX, yFromTop(188.88, FS), FS, regular);
  drawText(page, ":", colonX, yFromTop(188.88, FS), FS, regular);
  drawTextFit(page, s((service as any).airline), valueX, yFromTop(188.64, FS), FS, regular, MAX_VAL_W);

  // FLIGHT NUMBER (2 lines)
  drawText(page, "NOMOR PENERBANGAN/", labelX, yFromTop(202.80, FS), FS, regular);
  drawText(page, "Flight Number", 101.40, yFromTop(202.80, FS), FS, italic);
  // template prints ": 1." together at colonX line 1
  drawText(page, ": 1.", colonX, yFromTop(202.80, FS), FS, regular);
  drawTextFit(page, s((service as any).flightNumber), 244.80, yFromTop(202.80, FS), FS, regular, 120);

  // line 2 just "2."
  drawText(page, "2.", valueX, yFromTop(216.72, FS), FS, regular);
  // (optional) flightNumber2 value if any (ke kanan)
  const fn2 = s((service as any).flightNumber2);
  if (fn2) drawTextFit(page, fn2, 244.80, yFromTop(216.72, FS), FS, regular, 120);

  // REGISTRATION
  drawText(page, "REGISTRASI/", labelX, yFromTop(230.64, FS), FS, regular);
  drawText(page, "Registration", 66.60, yFromTop(230.64, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(230.64, FS), FS, regular);
  drawTextFit(page, s((service as any).registration), valueX, yFromTop(230.40, FS), FS, regular, MAX_VAL_W);

  // TYPE OF AIRCRAFT
  drawText(page, "JENIS PESAWAT/", labelX, yFromTop(244.56, FS), FS, regular);
  drawText(page, "Type of Aircraft", 78.12, yFromTop(244.56, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(244.56, FS), FS, regular);
  drawTextFit(page, s((service as any).aircraftType), valueX, yFromTop(244.32, FS), FS, regular, MAX_VAL_W);

  // Location/Remark headers
  drawText(page, "Location", 260.04, yFromTop(258.24, FS), FS, regular);
  drawText(page, "Remark", 449.16, yFromTop(258.24, FS), FS, regular);

  // Departured (line 1)
  drawText(page, "KEBERANGKATAN/", labelX, yFromTop(272.40, FS), FS, regular);
  drawText(page, "Departured", 83.52, yFromTop(272.40, FS), FS, italic);
  drawText(page, ": 1.", colonX, yFromTop(272.40, FS), FS, regular);

  // Location value x ≈ 266.28
  drawTextFit(page, s((service as any).depStation), 266.28, yFromTop(272.16, FS), FS, regular, 60);

  // Remark "1. DEP-ARR"
  const route1 = `${s((service as any).depStation)}-${s((service as any).arrStation)}`.trim();
  drawTextFit(page, `1. ${route1}`, 435.72, yFromTop(272.40, FS), FS, regular, 130);

  // Departured (line 2)
  drawText(page, "2.", valueX, yFromTop(286.32, FS), FS, regular);
  drawText(page, "2. -", 435.72, yFromTop(286.32, FS), FS, regular);

  // Arrival (line 1)
  drawText(page, "KEDATANGAN/Arrival", labelX, yFromTop(300.24, FS), FS, regular);
  drawText(page, ": 1.", colonX, yFromTop(300.24, FS), FS, regular);
  drawTextFit(page, s((service as any).arrStation), 264.72, yFromTop(300.00, FS), FS, regular, 60);

  // Arrival line 2 (just "2.")
  drawText(page, "2.", valueX, yFromTop(314.16, FS), FS, regular);

  // Arrival date & time
  drawText(page, "TANGGAL & WAKTU KEDATANGAN/", labelX, yFromTop(342.00, FS), FS, regular);
  drawText(page, "Arrival Date & Time", 130.32, yFromTop(342.00, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(342.00, FS), FS, regular);

  drawText(page, "ATA/Actual Time Arrival", 338.40, yFromTop(342.00, FS), FS, regular);

  // Date value at x ≈ 247.92
  drawText(page, formatIsoDateWib((service as any).arrivalDate), 247.92, yFromTop(341.76, FS), FS, regular);

  // Time value at x ≈ 461.52
  drawText(page, formatAsUtc((service as any).ataUtc, "HH:mm:ss"), 461.52, yFromTop(341.76, FS), FS, regular);

  // Departure date & time line (label only, like template)
  drawText(page, "TANGGAL & WAKTU KEBERANGKATAN/Departure", labelX, yFromTop(355.92, FS), FS, regular);
  drawText(page, "Date & Time", 168.24, yFromTop(355.92, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(355.92, FS), FS, regular);
  drawText(page, "ATD/Actual Time Departure", 338.40, yFromTop(355.92, FS), FS, regular);
  // (kalau kamu mau tampilkan ATD di kanan, kamu bisa uncomment ini)
  // drawText(page, formatAsUtc((service as any).atdUtc || (service as any).ataUtc, "HH:mm:ss"), 461.52, yFromTop(355.68, FS), FS, regular);

  // Fee will be paid by
  drawText(page, "DIBAYAR OLEH/Fee Will Be Paid By", labelX, yFromTop(369.84, FS), FS, regular);
  drawText(page, ":", colonX, yFromTop(369.84, FS), FS, regular);
  drawTextFit(page, s((service as any).airline), valueX, yFromTop(369.60, FS), FS, regular, MAX_VAL_W);

  // ---------- TABLE (use measured grid lines from PDF) ----------
  // Vertical lines at x: 31.2, 163.68, 218.4, 265.92, 318.24, 378.72, 441.6, 504.0, 568.8
  const X = [31.2, 163.68, 218.4, 265.92, 318.24, 378.72, 441.6, 504.0, 568.8];

  // Horizontal lines at yTop: 393.84, 408.36, 422.88, 437.40, 451.92, 466.44
  // drawn as thin rects:
  const H = [393.84, 408.36, 422.88, 437.40, 451.92, 466.44];
  // Draw outer + inner grid exactly
  // verticals
  for (const xv of X) {
    const r = rectFromTop(xv, 394.44, xv + 0.6, 467.04);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }
  // horizontals
  for (const yh of H) {
    const r = rectFromTop(31.8, yh, 569.4, yh + 0.6);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }
  // special horizontal line only from x=164.28 to 569.4 at y=422.88 (template has it)
  {
    const r = rectFromTop(164.28, 422.88, 569.40, 423.48);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }

  // Header row text yTop=398.28 size=6.72 bold
  const HB = 6.72;
  drawText(page, "ADVANCED/EXTENDED CHARGES", 51.84, yFromTop(398.28, HB), HB, bold);
  drawText(page, "START", 182.76, yFromTop(398.28, HB), HB, bold);
  drawText(page, "END", 236.76, yFromTop(398.28, HB), HB, bold);
  drawText(page, "DURATION", 277.32, yFromTop(398.28, HB), HB, bold);
  drawText(page, "RATE", 341.76, yFromTop(398.28, HB), HB, bold);
  drawText(page, "GROSS", 401.28, yFromTop(398.28, HB), HB, bold);
  drawText(page, "PPN/VAT 12%", 453.84, yFromTop(398.28, HB), HB, bold);
  drawText(page, "NET", 531.48, yFromTop(398.28, HB), HB, bold);

  // Row 1 values
  const startTime = formatAsUtc((service as any).serviceStartUtc, "HH:mm:ss");
  const endTime = formatAsUtc((service as any).serviceEndUtc, "HH:mm:ss");
  const duration = formatDuration(toNumberSafe((service as any).durationMinutes));

  const currency = s((service as any).currency) || "IDR";
  const rate = formatAmountForPdf(toNumberSafe((service as any).rate ?? (service as any).unitRate ?? 822000), currency);
  const gross = formatAmountForPdf(toNumberSafe((service as any).grossTotal), currency);
  const vat = formatAmountForPdf(toNumberSafe((service as any).vatTotal ?? (service as any).ppnTotal ?? 90420), currency);
  const net = formatAmountForPdf(toNumberSafe((service as any).netTotal), currency);

  // Text positions from PDF - use actual advanceExtend value
  const chargeType = (s((service as any).advanceExtend) || "EXTEND").toUpperCase();
  drawText(page, chargeType, 87.24, yFromTop(420.12, FS), FS, regular);
  drawText(page, startTime, 179.76, yFromTop(412.80, FS), FS, regular);
  drawText(page, endTime, 230.88, yFromTop(412.80, FS), FS, regular);
  drawText(page, duration, 282.48, yFromTop(412.80, FS), FS, regular);

  // RATE
  drawText(page, rate, 346.08, yFromTop(413.16, FS), FS, regular);

  // GROSS
  drawText(page, gross, 408.96, yFromTop(413.16, FS), FS, regular);

  // VAT
  drawText(page, vat, 474.72, yFromTop(412.80, FS), FS, regular);

  // NET
  drawText(page, net, 536.16, yFromTop(413.16, FS), FS, regular);

  // Row 2 (0:00:00)
  drawText(page, "0:00:00", 181.44, yFromTop(427.32, FS), FS, regular);
  drawText(page, "0:00:00", 232.56, yFromTop(427.32, FS), FS, regular);

  // PPH row
  drawText(page, "PPH PASAL 23", 464.16, yFromTop(441.84, HB), HB, bold);
  drawText(page, "-", 560.52, yFromTop(441.84, FS), FS, regular);

  // TOTAL row
  drawText(page, "T O T A L", 477.12, yFromTop(456.36, HB), HB, bold);
  drawText(page, formatAmountForPdf(toNumberSafe((service as any).netTotal), currency), 536.16, yFromTop(456.36, FS), FS, regular);

  // Note
  drawTextFit(
    page,
    "Note: Berdasarkan PMK No.131 Tahun 2024 menggunakan DPP Lain-lain (11/12*harga jual/penggantian)*12%",
    63.36,
    yFromTop(467.64, HB),
    HB,
    bold,
    520
  );

  // Detail Bank Transfer title
  drawText(page, "Detail Bank Transfer :", 32.64, yFromTop(478.68, HB), HB, bold);

  // Bank box (measured): left=61.92 top=488.40 right=523.32 bottom=527.28
  {
    const left = 61.92, top = 488.40, right = 523.32, bottom = 527.28;

    // border lines as thin rect (match template)
    // left vertical
    const leftVertical = rectFromTop(left, top, left + 0.6, bottom);
    drawThinRect(page, leftVertical.x, leftVertical.y, leftVertical.width, leftVertical.height);
    // right vertical
    const rightVertical = rectFromTop(right - 0.6, top, right, bottom);
    drawThinRect(page, rightVertical.x, rightVertical.y, rightVertical.width, rightVertical.height);
    // top horizontal
    const topHorizontal = rectFromTop(left, top, right, top + 0.6);
    drawThinRect(page, topHorizontal.x, topHorizontal.y, topHorizontal.width, topHorizontal.height);
    // bottom horizontal
    const bottomHorizontal = rectFromTop(left, bottom - 0.6, right, bottom);
    drawThinRect(page, bottomHorizontal.x, bottomHorizontal.y, bottomHorizontal.width, bottomHorizontal.height);

    // Text inside (use BANK_DETAILS, match positions)
    const bxLabelX = 63.36;
    const bxColonX = 112.80;
    const bxValX = 127.56;

    const bankName = s((BANK_DETAILS as any).bankName);
    const branch = s((BANK_DETAILS as any).branchName);
    const accName = s((BANK_DETAILS as any).accountName);
    const accNo = s((BANK_DETAILS as any).accountNumber);

    drawText(page, "Nama Bank", bxLabelX, yFromTop(491.04, FS), FS, bold);
    drawText(page, ":", bxColonX, yFromTop(491.04, FS), FS, regular);
    drawTextFit(page, bankName, bxValX, yFromTop(492.96, FS), FS, regular, 380);

    drawText(page, "Nama Cabang", bxLabelX, yFromTop(502.08, FS), FS, bold);
    drawText(page, ":", bxColonX, yFromTop(502.08, FS), FS, regular);
    drawTextFit(page, branch, bxValX, yFromTop(504.00, FS), FS, regular, 380);

    drawText(page, "Nama Rekening", bxLabelX, yFromTop(513.12, FS), FS, bold);
    drawText(page, ":", bxColonX, yFromTop(513.12, FS), FS, regular);
    drawTextFit(page, accName, bxValX, yFromTop(510.24, FS), FS, regular, 380);

    drawText(page, "No. Rekening", bxLabelX, yFromTop(523.92, FS), FS, bold);
    drawText(page, ":", bxColonX, yFromTop(523.92, FS), FS, regular);
    drawTextFit(page, accNo, bxValX, yFromTop(521.28, FS), FS, regular, 380);
  }

  // Signature block
  drawText(page, "Petugas Official AIRNAV INDONESIA", 353.40, yFromTop(544.20, HB), HB, regular);

  // Signature image rect: Rect(342.0, 554.16, 450.0, 590.40)
  if (signature) {
    const r = rectFromTop(342.0, 554.16, 450.0, 590.40);
    page.drawImage(signature, r);
  }

  const officerName = s((service as any).picDinas || "WIDYA ANGGRAINI").toUpperCase();
  drawText(page, officerName, 373.68, yFromTop(605.88, HB), HB, regular);

  // Signature underline rect: x0=337.20 y0=612.84 x1=461.64 y1=613.44
  {
    const r = rectFromTop(337.20, 612.84, 461.64, 613.44);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }

  // CC
  drawText(page, "CC :", 32.64, yFromTop(651.24, HB), HB, regular);
  drawText(page, "1. Customer", 32.64, yFromTop(671.88, HB), HB, regular);
  drawText(page, "2. Finance", 32.64, yFromTop(686.52, HB), HB, regular);
  drawText(page, "3. File", 32.64, yFromTop(701.16, HB), HB, regular);

  return await pdfDoc.save();
}

// ============================================================
// LAMPIRAN 2 (Receipt) — fixed coordinates from your PDF page 2
// ============================================================
export async function generateReceiptPdf(service: FlightService): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const { regular, bold, italic } = await loadFonts(pdfDoc);

  const logo = await tryEmbedPng(pdfDoc, path.join(process.cwd(), "public", "logos", "airnav.png"));
  const signature = await tryEmbedPng(pdfDoc, path.join(process.cwd(), "public", "signatures", "widya_anggriani.png"));

  // Logo rect from template page2: Rect(66.84, 51.12, 246.24, 108.60)
  if (logo) {
    const r = rectFromTop(66.84, 51.12, 246.24, 108.60);
    page.drawImage(logo, r);
  }

  // Receipt Number line
  const rNo = splitReceiptNo(s((service as any).receiptNo));
  drawText(page, "Receipt Number  :", 327.96, yFromTop(94.08, 8.64), 8.64, regular);
  drawText(page, rNo.left, 404.88, yFromTop(94.08, 8.64), 8.64, regular);
  if (rNo.right) drawText(page, rNo.right, 508.44, yFromTop(94.08, 8.64), 8.64, regular);

  // Titles
  drawText(page, "AIRNAV INDONESIA", 236.28, yFromTop(152.64, 13.44), 13.44, bold);
  drawText(
    page,
    "PERUM LEMBAGA PENYELENGGARA PELAYANAN NAVIGASI PENERBANGAN INDONESIA",
    167.64,
    yFromTop(168.00, 7.32),
    7.32,
    bold
  );
  drawText(page, "ADVANCED/EXTENDED CHARGES", 250.32, yFromTop(177.12, 7.32), 7.32, bold);

  // Separator line rect: x0=39.96 y0=175.68 x1=558.60 y1=176.40
  {
    const r = rectFromTop(39.96, 175.68, 558.60, 176.40);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }

  // Detail block columns (page2)
  const labelX = 41.40;
  const colonX = 258.84;
  const valueX = 272.40;
  const FS = 7.9176;

  const dateStr = formatEnWibDate((service as any).receiptDate);
  const airline = s((service as any).airline);

  const currency = s((service as any).currency) || "IDR";
  const amount = formatAmountForPdf(toNumberSafe((service as any).netTotal), currency);
  const say = numberToWordsID(Number((service as any).netTotal || 0));
  const payment = `${(s((service as any).advanceExtend) || "EXTEND").toUpperCase()} CHARGES`;

  // TANGGAL
  drawText(page, "TANGGAL/", labelX, yFromTop(192.90, FS), FS, regular);
  drawText(page, "Date", 75.96, yFromTop(192.90, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(192.90, FS), FS, regular);
  drawText(page, dateStr, valueX, yFromTop(192.54, FS), FS, regular);

  // TERIMA DARI
  drawText(page, "TERIMA DARI/", labelX, yFromTop(212.34, FS), FS, regular);
  drawText(page, "Received From", 87.36, yFromTop(212.34, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(212.34, FS), FS, regular);
  drawTextFit(page, airline, valueX, yFromTop(211.98, FS), FS, regular, 280);

  // SEJUMLAH
  drawText(page, "SEJUMLAH/", labelX, yFromTop(231.78, FS), FS, regular);
  drawText(page, "Amount", 78.96, yFromTop(231.78, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(231.78, FS), FS, regular);
  drawText(page, amount, 333.72, yFromTop(231.42, FS), FS, regular);

  // KURS
  drawText(page, "KURS/", labelX, yFromTop(251.22, FS), FS, regular);
  drawText(page, "Exchange Rate", 61.44, yFromTop(251.22, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(251.22, FS), FS, regular);
  const exchangeRateVal = toNumberSafe((service as any).exchangeRate);
  drawText(page, exchangeRateVal > 0 ? formatNumber(exchangeRateVal) : "", 333.72, yFromTop(250.86, FS), FS, regular);

  // TERBILANG
  drawText(page, "TERBILANG/", labelX, yFromTop(270.66, FS), FS, regular);
  drawText(page, "Say", 80.88, yFromTop(270.66, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(270.66, FS), FS, regular);
  drawTextFit(page, say, valueX, yFromTop(270.30, FS), FS, regular, 360);

  // PEMBAYARAN
  drawText(page, "PEMBAYARAN/", labelX, yFromTop(290.10, FS), FS, regular);
  drawText(page, "Payment", 90.36, yFromTop(290.10, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(290.10, FS), FS, regular);
  drawText(page, payment, valueX, yFromTop(289.74, FS), FS, regular);

  // JUMLAH YANG DIBAYARKAN
  drawText(page, "JUMLAH YANG DIBAYARKAN/", labelX, yFromTop(309.54, FS), FS, regular);
  drawText(page, "Amount To Paid", 136.08, yFromTop(309.54, FS), FS, italic);
  drawText(page, ":", colonX, yFromTop(309.54, FS), FS, regular);
  drawText(page, amount, 369.96, yFromTop(309.18, FS), FS, regular);

  // Signature title
  drawText(page, "Petugas Official AIRNAV INDONESIA", 241.92, yFromTop(348.06, FS), FS, regular);

  // Signature image (use bigger rect from template page2: Rect(243.36, 356.64, 371.16, 400.32))
  if (signature) {
    const r = rectFromTop(243.36, 356.64, 371.16, 400.32);
    page.drawImage(signature, r);
  }

  // Officer name
  const officerName = s((service as any).picDinas || "WIDYA ANGGRAINI").toUpperCase();
  drawText(page, officerName, 279.24, yFromTop(406.38, FS), FS, regular);

  // Underline rect: x0=221.16 y0=419.40 x1=399.00 y1=420.12
  {
    const r = rectFromTop(221.16, 419.40, 399.00, 420.12);
    drawThinRect(page, r.x, r.y, r.width, r.height);
  }

  // CC
  drawText(page, "CC :", 41.40, yFromTop(451.62, FS), FS, regular);
  drawText(page, "1. Customer", 41.40, yFromTop(471.06, FS), FS, regular);
  drawText(page, "2. Finance", 41.40, yFromTop(486.42, FS), FS, regular);
  drawText(page, "3. File", 41.40, yFromTop(501.78, FS), FS, regular);

  return await pdfDoc.save();
}

// ============================================================
// Combined + Storage
// ============================================================
export async function generateCombinedPdf(service: FlightService): Promise<Uint8Array> {
  const breakdownBuffer = await generateBreakdownPdf(service);
  const receiptBuffer = await generateReceiptPdf(service);

  const breakdownDoc = await PDFDocument.load(breakdownBuffer);
  const receiptDoc = await PDFDocument.load(receiptBuffer);
  const combinedDoc = await PDFDocument.create();

  const breakdownPages = await combinedDoc.copyPages(breakdownDoc, breakdownDoc.getPageIndices());
  breakdownPages.forEach((p) => combinedDoc.addPage(p));

  const receiptPages = await combinedDoc.copyPages(receiptDoc, receiptDoc.getPageIndices());
  receiptPages.forEach((p) => combinedDoc.addPage(p));

  return await combinedDoc.save();
}

export async function savePdf(
  buffer: Uint8Array,
  type: "receipt" | "breakdown" | "combined",
  receiptNo: string
): Promise<string> {
  const filename = `${receiptNo.replace(/\./g, "_")}_${type}.pdf`;
  const dir = path.join(STORAGE_DIR, type);
  const filePath = path.join(dir, filename);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return filePath;
}

export async function readPdf(filePath: string): Promise<Uint8Array> {
  const buffer = await fs.readFile(filePath);
  return new Uint8Array(buffer);
}
