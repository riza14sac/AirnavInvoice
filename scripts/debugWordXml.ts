// Debug script to find how text is split in Word XML

import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const INPUT_PATH = path.join(process.cwd(), "templates", "Template iA.docx");

const searchTerms = [
    "PT. BATIK INDONESIA AIR",
    "BANK SYARIAH INDONESIA",
    "CABANG BANDA ACEH",
    "PERUM LPPNPI CABANG BANDA ACEH",
    "24 December 2025",
    "2025-12-13",
    "WIII-WITT",
    "Sembilan Ratus",
];

async function debugXml() {
    console.log("=== DEBUG XML STRUCTURE ===\n");

    const content = fs.readFileSync(INPUT_PATH);
    const zip = new PizZip(content);
    const docXml = zip.file("word/document.xml");

    if (!docXml) {
        throw new Error("Could not find word/document.xml");
    }

    const xml = docXml.asText();

    // Extract text runs with surrounding context
    for (const term of searchTerms) {
        console.log(`\n--- Searching for: "${term}" ---`);

        // Search for partial matches
        const words = term.split(/\s+/);
        for (const word of words) {
            if (word.length < 3) continue;

            const idx = xml.indexOf(word);
            if (idx !== -1) {
                // Show context around the match
                const start = Math.max(0, idx - 100);
                const end = Math.min(xml.length, idx + word.length + 100);
                const context = xml.substring(start, end);
                console.log(`Found "${word}" at ${idx}:`);
                console.log(`  ...${context.replace(/\n/g, "\\n")}...`);
            } else {
                console.log(`NOT FOUND: "${word}"`);
            }
        }
    }
}

debugXml().catch(console.error);
