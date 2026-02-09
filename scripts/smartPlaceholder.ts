// Smart placeholder insertion that handles Word's fragmented XML
// Uses paragraph-level text extraction and reconstruction

import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const INPUT_PATH = path.join(process.cwd(), "templates", "Template iA.docx");
const OUTPUT_PATH = path.join(process.cwd(), "templates", "Template_Placeholder.docx");

// Replacements map: search -> placeholder
const replacements = new Map<string, string>([
    ["PT. BATIK INDONESIA AIR", "{airline}"],
    ["BANK SYARIAH INDONESIA", "{bankName}"],
    ["CABANG BANDA ACEH", "{bankBranch}"],
    ["PERUM LPPNPI CABANG BANDA ACEH", "{accountName}"],
    ["Sembilan Ratus Duabelas Ribu Empat Ratus Dua Puluh Rupiah", "{terbilang}"],
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
]);

/**
 * Process paragraph by paragraph, merge text, replace, then reconstruct
 */
function processXml(xml: string): string {
    // Find all paragraphs
    const paragraphRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;

    let result = xml;
    let match;
    let replacementCount = 0;

    while ((match = paragraphRegex.exec(xml)) !== null) {
        const fullParagraph = match[0];
        const paragraphContent = match[2];

        // Extract all text from this paragraph
        const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        const texts: string[] = [];
        let textMatch;

        while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
            texts.push(textMatch[1]);
        }

        const fullText = texts.join("");

        // Check if any replacement matches
        for (const [searchText, placeholder] of replacements) {
            if (fullText.includes(searchText)) {
                // Found a match! Now we need to replace in the XML
                // Strategy: Find the first <w:t> that starts the match and replace

                // Create a modified paragraph where we consolidate the matched text
                let newParagraph = fullParagraph;

                // For simplicity, we'll replace word by word
                const searchWords = searchText.split(/\s+/);

                if (searchWords.length === 1) {
                    // Single word - direct replace
                    const wordRegex = new RegExp(`(<w:t[^>]*>)${escapeRegex(searchText)}(<\\/w:t>)`, "g");
                    if (wordRegex.test(newParagraph)) {
                        newParagraph = newParagraph.replace(wordRegex, `$1${placeholder}$2`);
                        result = result.replace(fullParagraph, newParagraph);
                        console.log(`✓ Single word: "${searchText}" → "${placeholder}"`);
                        replacementCount++;
                    }
                } else {
                    // Multi-word - need to find first word and replace runs
                    const firstWord = searchWords[0];
                    const firstWordIdx = newParagraph.indexOf(`>${firstWord}<`);

                    if (firstWordIdx !== -1) {
                        // Find the opening tag before this
                        const beforeText = newParagraph.substring(0, firstWordIdx + 1);
                        const lastOpenTag = beforeText.lastIndexOf("<w:t");

                        // Find where the full multi-word text ends
                        const lastWord = searchWords[searchWords.length - 1];
                        const afterFirstWord = newParagraph.substring(firstWordIdx);
                        const lastWordIdx = afterFirstWord.indexOf(`>${lastWord}<`);

                        if (lastWordIdx !== -1) {
                            // Find closing tag after last word
                            const afterLastWord = afterFirstWord.substring(lastWordIdx + lastWord.length + 1);
                            const closeTagIdx = afterLastWord.indexOf("</w:t>");

                            if (closeTagIdx !== -1) {
                                const endOfReplacement = firstWordIdx + lastWordIdx + lastWord.length + 1 + closeTagIdx + 6;

                                // Replace the entire span with a single run containing the placeholder
                                const before = newParagraph.substring(0, lastOpenTag);
                                const after = newParagraph.substring(firstWordIdx + endOfReplacement - firstWordIdx);

                                // Get the formatting from the first run
                                const firstRunMatch = newParagraph.substring(lastOpenTag).match(/<w:t[^>]*>/);
                                const openTag = firstRunMatch ? firstRunMatch[0] : "<w:t>";

                                newParagraph = before + `<w:r><w:rPr/>${openTag}${placeholder}</w:t></w:r>` + after;
                                result = result.replace(fullParagraph, newParagraph);
                                console.log(`✓ Multi-word: "${searchText}" → "${placeholder}"`);
                                replacementCount++;
                            }
                        }
                    }
                }
            }
        }
    }

    // Also do simple direct replacements for any remaining
    for (const [searchText, placeholder] of replacements) {
        if (result.includes(searchText)) {
            result = result.split(searchText).join(placeholder);
            console.log(`✓ Direct: "${searchText}" → "${placeholder}"`);
            replacementCount++;
        }
    }

    console.log(`\nTotal replacements: ${replacementCount}`);
    return result;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
    console.log("=== SMART PLACEHOLDER INSERTION ===\n");

    const content = fs.readFileSync(INPUT_PATH);
    const zip = new PizZip(content);
    const docXml = zip.file("word/document.xml");

    if (!docXml) {
        throw new Error("Could not find word/document.xml");
    }

    let xml = docXml.asText();
    xml = processXml(xml);

    zip.file("word/document.xml", xml);
    const output = zip.generate({ type: "nodebuffer" });
    fs.writeFileSync(OUTPUT_PATH, output);

    console.log(`\nSaved to: ${OUTPUT_PATH}`);
}

main().catch(console.error);
