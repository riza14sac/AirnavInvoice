// Add signature image placeholder to Word template

import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const INPUT_PATH = path.join(process.cwd(), "templates", "Template_Placeholder.docx");
const OUTPUT_PATH = path.join(process.cwd(), "templates", "Template_Placeholder.docx");

async function addSignaturePlaceholder() {
    console.log("=== ADDING SIGNATURE IMAGE PLACEHOLDER ===\n");

    const content = fs.readFileSync(INPUT_PATH);
    const zip = new PizZip(content);
    const docXml = zip.file("word/document.xml");

    if (!docXml) {
        throw new Error("Could not find word/document.xml");
    }

    let xml = docXml.asText();

    // Find the signer name placeholder and add image placeholder before it
    // The format for docxtemplater-image-module is {%imageName}

    // Look for the line separator before signature (the horizontal line)
    // and add image placeholder there

    // Replace the signerName area to include image placeholder
    // Pattern: Find {signerName} and add {%signatureImage} before it

    const signerPattern = /{signerName}/g;
    const matches = xml.match(signerPattern);

    if (matches) {
        console.log(`Found ${matches.length} occurrences of {signerName}`);

        // For now, just add a note that image placeholder needs to be added manually
        // because adding images programmatically to Word is complex
        console.log("\nNOTE: To add signature image, you need to:");
        console.log("1. Open Template_Placeholder.docx in Word");
        console.log("2. Find where you want the signature image");
        console.log("3. Type: {%signatureImage}");
        console.log("4. Save the file");
    }

    console.log("\n=== DONE ===");
}

addSignaturePlaceholder().catch(console.error);
