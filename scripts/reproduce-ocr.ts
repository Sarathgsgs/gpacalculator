import Tesseract from "tesseract.js";
import * as fs from "fs";
import * as path from "path";

const MOCK_FILE = path.join(process.cwd(), "ocr_debug_utf8.txt");

const IMAGE_PATH =
    "C:/Users/GOKUL GNANAVELU/.gemini/antigravity/brain/498c760b-f57f-4e44-b193-320ef6f59e4a/uploaded_media_0_1770908247533.jpg";

const COURSE_CODES = [
    "23CS4401",
    "23CS4402",
    "23CS4403",
    "23CS4404",
    "23CS4405",
    "23CS4L01",
    "23CS4L02",
    "23SD4XXX",
    "23PL4004",
    "23IN4XXX"
];

import { extractGradesForCourses, countMatches } from "../src/utils/ocrGrades";
import type { Grade } from "../src/utils/types";

// Removed inlined logic to use true source


async function run() {

    let text = "";

    if (fs.existsSync(MOCK_FILE)) {
        console.log("Reading mock output from:", MOCK_FILE);
        text = fs.readFileSync(MOCK_FILE, "utf8");
    } else {
        console.log("Running Tesseract on image...");

        const worker = await Tesseract.createWorker("eng");

        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            tessedit_char_whitelist:
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+ "
        });

        const { data } = await worker.recognize(IMAGE_PATH);

        await worker.terminate();

        text = data.text;
    }

    console.log("\n--- OCR TEXT START ---\n");
    console.log(text);
    console.log("\n--- OCR TEXT END ---\n");

    const results = extractGradesForCourses(text, COURSE_CODES);

    console.log("\nFinal Results:");
    console.log(results);
}

run().catch(console.error);
