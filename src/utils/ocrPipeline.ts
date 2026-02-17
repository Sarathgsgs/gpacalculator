import { preprocessImage } from "./imagePreprocess";
import { extractGradesForCourses, countMatches } from "./ocrGrades";
import type { Grade } from "./types";
// We need to import Tesseract dynamically in the function to avoid SSR issues if used there, 
// but for a client-side utility it's fine. 

export type OcrResult = {
    extracted: Record<string, Grade>;
    rawText: string;
    matches: number;
    error?: string;
    debugImageUrl?: string; // Blob URL of the preprocessed image
};

export async function performOcrPipeline(
    imageBlob: Blob,
    courseCodes: string[],
    onStatusUpdate?: (status: string, progress: number) => void
): Promise<OcrResult> {
    const update = (s: string, p: number) => onStatusUpdate?.(s, p);

    try {
        update("Preprocessing...", 10);
        // 1. Preprocess
        // The preprocessImage function now handles row segmentation internally
        const cleanBlob = await preprocessImage(imageBlob);
        const cleanUrl = URL.createObjectURL(cleanBlob);

        update("Initializing OCR...", 30);
        const Tesseract = await import("tesseract.js");

        const worker = await Tesseract.createWorker("eng", 1, {
            logger: (m) => {
                if (m.status === "recognizing text") {
                    update("Recognizing...", 30 + (m.progress * 60));
                }
            }
        });

        // Set parameters
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // Best for our segmented layout
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+. ",
        });

        update("Scanning text...", 50);
        const { data } = await worker.recognize(cleanBlob);
        await worker.terminate();

        const text = data.text;

        // 2. Extract
        update("Analyzing results...", 90);
        const extracted = extractGradesForCourses(text, courseCodes);
        const matches = countMatches(extracted);

        // Optional: Second pass if poor results (logic from original component)
        // For benchmark tool, we might want to keep it simple first, or copy that logic.
        // Let's stick to the single pass first as our segmentation should be robust.
        // If we want the multi-pass, we can add it later.

        update("Done", 100);
        return {
            extracted,
            rawText: text,
            matches,
            debugImageUrl: cleanUrl
        };

    } catch (e: any) {
        console.error("OCR Pipeline Error:", e);
        return {
            extracted: {},
            rawText: "",
            matches: 0,
            error: e.message || "Unknown error"
        };
    }
}
