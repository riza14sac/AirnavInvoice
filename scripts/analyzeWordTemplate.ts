// Script to analyze Word template and extract text content
import mammoth from "mammoth";
import path from "path";
import fs from "fs";

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "Template iA.docx");

async function analyzeWordTemplate() {
    console.log("=== ANALYZING WORD TEMPLATE ===\n");
    console.log(`File: ${TEMPLATE_PATH}\n`);

    // Check if file exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error("File not found!");
        return;
    }

    // Extract raw text
    const result = await mammoth.extractRawText({ path: TEMPLATE_PATH });
    const text = result.value;

    console.log("=== RAW TEXT CONTENT ===\n");
    console.log(text);

    console.log("\n=== POTENTIAL FIELDS TO REPLACE ===\n");

    // Try to identify key fields based on common invoice/receipt patterns
    const patterns = [
        { label: "Receipt Number", regex: /Receipt\s*Number\s*[:：]?\s*([^\n]+)/gi },
        { label: "Date", regex: /(?:TANGGAL|Date)\s*[:：]?\s*([^\n]+)/gi },
        { label: "Airline", regex: /(?:AIRLINE|MASKAPAI)\s*[:：]?\s*([^\n]+)/gi },
        { label: "Flight Number", regex: /(?:FLIGHT\s*(?:NO|NUMBER)|NOMOR\s*PENERBANGAN)\s*[:：]?\s*([^\n]+)/gi },
        { label: "Registration", regex: /(?:REGISTRATION|REGISTRASI)\s*[:：]?\s*([^\n]+)/gi },
        { label: "Aircraft Type", regex: /(?:AIRCRAFT\s*TYPE|JENIS\s*PESAWAT)\s*[:：]?\s*([^\n]+)/gi },
        { label: "Amount", regex: /(?:SEJUMLAH|AMOUNT)\s*[:：]?\s*([^\n]+)/gi },
        { label: "Total", regex: /(?:JUMLAH|TOTAL)\s*[:：]?\s*([^\n]+)/gi },
    ];

    for (const { label, regex } of patterns) {
        const matches = text.matchAll(regex);
        for (const match of matches) {
            console.log(`${label}: "${match[1]?.trim()}"`);
        }
    }
}

analyzeWordTemplate().catch(console.error);
