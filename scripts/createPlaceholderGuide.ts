// Script to create a placeholder template from the original Word file
// This will help identify where to manually add placeholders

import mammoth from "mammoth";
import path from "path";

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "Template iA.docx");

async function createPlaceholderGuide() {
    console.log("=== PLACEHOLDER MAPPING GUIDE ===\n");
    console.log("Open the Word template and replace the following values with placeholders:\n");

    const result = await mammoth.extractRawText({ path: TEMPLATE_PATH });
    const text = result.value;

    // Define replacements
    const replacements = [
        { original: "WITT.21.2025.12.", placeholder: "{receiptNoPrefix}", note: "Receipt number prefix" },
        { original: "0208", placeholder: "{receiptNoSeq}", note: "Receipt sequence number (after prefix)" },
        { original: "24 December 2025", placeholder: "{receiptDate}", note: "Receipt date" },
        { original: "PT. BATIK INDONESIA AIR", placeholder: "{airline}", note: "Airline name (appears multiple times)" },
        { original: "BTK6898", placeholder: "{flightNumber1}", note: "Flight number 1" },
        { original: "PKLZH", placeholder: "{registration}", note: "Aircraft registration" },
        { original: "A320", placeholder: "{aircraftType}", note: "Aircraft type" },
        { original: "WIII", placeholder: "{depStation}", note: "Departure station (appears in location)" },
        { original: "WITT", placeholder: "{arrStation}", note: "Arrival station" },
        { original: "WIII-WITT", placeholder: "{remark1}", note: "Remark 1" },
        { original: "2025-12-13", placeholder: "{arrivalDate}", note: "Arrival date" },
        { original: "19:05:00", placeholder: "{ataTime}", note: "Actual time arrival (also appears in END)" },
        { original: "19:00:00", placeholder: "{serviceStart}", note: "Service start time" },
        { original: "0:05:00", placeholder: "{duration}", note: "Duration" },
        { original: "822,000.00", placeholder: "{rate}", note: "Rate (also appears in GROSS)" },
        { original: "90,420.00", placeholder: "{ppn}", note: "PPN amount" },
        { original: "912,420.00", placeholder: "{netTotal}", note: "Net total" },
        { original: "912,420", placeholder: "{total}", note: "Total (without decimals, appears multiple times)" },
        { original: "EXTEND", placeholder: "{advanceExtend}", note: "ADVANCE or EXTEND" },
        { original: "Sembilan Ratus Duabelas Ribu Empat Ratus Dua Puluh Rupiah", placeholder: "{terbilang}", note: "Amount in words" },
        { original: "WIDYA ANGGRAINI", placeholder: "{signerName}", note: "Signer name (appears twice)" },
        { original: "BANK SYARIAH INDONESIA", placeholder: "{bankName}", note: "Bank name" },
        { original: "CABANG BANDA ACEH", placeholder: "{bankBranch}", note: "Bank branch" },
        { original: "PERUM LPPNPI CABANG BANDA ACEH", placeholder: "{accountName}", note: "Account name" },
        { original: "7143344287", placeholder: "{accountNumber}", note: "Account number" },
    ];

    console.log("| Original Value | Placeholder | Notes |");
    console.log("|----------------|-------------|-------|");
    for (const r of replacements) {
        console.log(`| ${r.original} | ${r.placeholder} | ${r.note} |`);
    }

    console.log("\n=== INSTRUCTIONS ===");
    console.log("1. Open templates/Template iA.docx in Microsoft Word");
    console.log("2. Use Find & Replace (Ctrl+H) to replace each original value with its placeholder");
    console.log("3. Save as templates/Template_Placeholder.docx");
    console.log("\nNote: Some values appear multiple times, make sure to replace ALL occurrences.");
}

createPlaceholderGuide().catch(console.error);
