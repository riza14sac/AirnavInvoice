import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { FlightService } from "@prisma/client";

// Fungsi untuk meluncurkan browser di lokal atau Vercel
async function getBrowser() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return puppeteer.launch({
      args: [],
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", 
      headless: true,
    });
  } else {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        'https://github.com/sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      ),
      headless: chromium.headless,
    });
  }
}

export async function generateReceiptPdf(service: FlightService): Promise<Uint8Array> {
  return generateGenericPdf(service.id, 'receipt');
}

export async function generateBreakdownPdf(service: FlightService): Promise<Uint8Array> {
  return generateGenericPdf(service.id, 'breakdown');
}

export async function generateCombinedPdf(service: FlightService): Promise<Uint8Array> {
  return generateGenericPdf(service.id, 'combined');
}

// Fungsi inti cetak PDF
async function generateGenericPdf(serviceId: string, type: string): Promise<Uint8Array> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Ambil URL dari Environment Variable Vercel
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Navigasi ke halaman preview yang sudah dibuat kawanmu
    await page.goto(`${baseUrl}/services/${serviceId}/preview?type=${type}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5cm', bottom: '0.5cm', left: '0.5cm', right: '0.5cm' }
    });

    return new Uint8Array(pdf);
  } finally {
    if (browser) await browser.close();
  }
}

// Fungsi Save ini diubah agar tidak nulis ke disk Vercel yang Read-Only
export async function savePdf(buffer: Uint8Array, type: string, receiptNo: string): Promise<string> {
  // Kita kembalikan dummy path saja karena di Vercel kita akan streaming file langsung
  return `generated_${type}_${receiptNo}.pdf`;
}
