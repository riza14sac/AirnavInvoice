// Advanced script to insert placeholders into Word template
// Handles Word's XML structure where text is split across multiple runs

import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const INPUT_PATH = path.join(process.cwd(), "templates", "Template iA.docx");
const OUTPUT_PATH = path.join(process.cwd(), "templates", "Template_Placeholder.docx");

// Define all replacements
const replacements: [string, string][] = [
    // Long strings first (order matters!)
    ["Sembilan Ratus Duabelas Ribu Empat Ratus Dua Puluh Rupiah", "{terbilang}"],
    ["PERUM LPPNPI CABANG BANDA ACEH", "{accountName}"],
    ["PT. BATIK INDONESIA AIR", "{airline}"],
    ["BANK SYARIAH INDONESIA", "{bankName}"],
    ["CABANG BANDA ACEH", "{bankBranch}"],
    ["WIDYA ANGGRAINI", "{signerName}"],
    ["WITT.21.2025.12.", "{receiptNoPrefix}"],
    ["24 December 2025", "{receiptDate}"],
    ["WIII-WITT", "{remark1}"],
    ["2025-12-13", "{arrivalDate}"],
    ["7143344287", "{accountNumber}"],
    ["912,420.00", "{netTotal}"],
    ["822,000.00", "{rate}"],
    ["90,420.00", "{ppn}"],
    ["912,420", "{total}"],
    ["19:05:00", "{ataTime}"],
    ["19:00:00", "{serviceStart}"],
    ["0:05:00", "{duration}"],
    ["BTK6898", "{flightNumber1}"],
    ["PKLZH", "{registration}"],
    ["A320", "{aircraftType}"],
    ["0208", "{receiptNoSeq}"],
];

/**
 * Merge text across XML runs and perform replacement
 * This handles cases where Word splits text like "PT. BATIK" into multiple <w:t> elements
 */
function replaceAcrossRuns(xml: string): string {
    let result = xml;

    for (const [searchText, replacement] of replacements) {
        // Create a regex that matches the text even if split by XML tags
        // For example: "PT. BATIK" might be stored as "PT. </w:t></w:r><w:r><w:t>BATIK"

        // First, try simple replacement
        if (result.includes(searchText)) {
            result = result.split(searchText).join(replacement);
            console.log(`✓ Direct replacement: "${searchText}" → "${replacement}"`);
            continue;
        }

        // Try matching across XML tags
        // Build a regex that allows XML tags between characters
        const chars = searchText.split("");
        const flexiblePattern = chars.map(c => {
            // Escape special regex characters
            const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            // Allow XML tags between characters
            return escaped + "(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?";
        }).join("");

        const regex = new RegExp(flexiblePattern, "g");
        const matches = result.match(regex);

        if (matches && matches.length > 0) {
            // Found matches with XML in between - need to carefully replace
            for (const match of matches) {
                result = result.replace(match, replacement);
            }
            console.log(`✓ Cross-run replacement: "${searchText}" → "${replacement}" (${matches.length} matches)`);
        } else {
            console.log(`✗ Not found: "${searchText}"`);
        }
    }

    return result;
}

/**
 * Alternative approach: Extract all text, find positions, rebuild
 */
function extractAndReplace(xml: string): string {
    // Get all text content between <w:t> tags
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;

    // First pass: concatenate all text to find the full string
    let fullText = "";
    let match;
    const segments: { start: number; end: number; text: string }[] = [];

    while ((match = textRegex.exec(xml)) !== null) {
        segments.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[1]
        });
        fullText += match[1];
    }

    console.log(`\nExtracted ${segments.length} text segments`);
    console.log(`Full text length: ${fullText.length} characters\n`);

    // For each replacement, find in fullText and map back to segments
    let result = xml;

    for (const [searchText, replacement] of replacements) {
        const idx = fullText.indexOf(searchText);
        if (idx !== -1) {
            console.log(`Found "${searchText}" at position ${idx}`);

            // Find which segments contain this text
            let pos = 0;
            let startSegmentIdx = -1;
            let endSegmentIdx = -1;
            let startOffset = 0;
            let endOffset = 0;

            for (let i = 0; i < segments.length; i++) {
                const segEnd = pos + segments[i].text.length;

                if (startSegmentIdx === -1 && idx < segEnd) {
                    startSegmentIdx = i;
                    startOffset = idx - pos;
                }

                if (startSegmentIdx !== -1 && idx + searchText.length <= segEnd) {
                    endSegmentIdx = i;
                    endOffset = idx + searchText.length - pos;
                    break;
                }

                pos = segEnd;
            }

            if (startSegmentIdx !== -1) {
                console.log(`  Spans segments ${startSegmentIdx} to ${endSegmentIdx}`);
            }
        }
    }

    return result;
}

async function insertPlaceholders() {
    console.log("=== ADVANCED PLACEHOLDER INSERTION ===\n");
    console.log(`Input: ${INPUT_PATH}`);
    console.log(`Output: ${OUTPUT_PATH}\n`);

    // Read the docx file
    const content = fs.readFileSync(INPUT_PATH);
    const zip = new PizZip(content);

    // Get the main document XML
    const docXml = zip.file("word/document.xml");
    if (!docXml) {
        throw new Error("Could not find word/document.xml");
    }

    let xmlContent = docXml.asText();

    // Apply replacements
    xmlContent = replaceAcrossRuns(xmlContent);

    // Update the zip
    zip.file("word/document.xml", xmlContent);

    // Write output
    const output = zip.generate({ type: "nodebuffer" });
    fs.writeFileSync(OUTPUT_PATH, output);

    console.log(`\n=== DONE ===`);
    console.log(`Output saved to: ${OUTPUT_PATH}`);
}

insertPlaceholders().catch(console.error);
