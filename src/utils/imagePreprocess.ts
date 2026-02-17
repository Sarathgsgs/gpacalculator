/**
 * Canvas-based image preprocessing for better Tesseract OCR accuracy.
 *
 * Pipeline: load → upscale → grayscale → contrast stretch → binarize → export blob
 */

async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
    const url = src instanceof Blob ? URL.createObjectURL(src) : src;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (src instanceof Blob) URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = reject;
        img.crossOrigin = "anonymous";
        img.src = url;
    });
}

/**
 * Preprocess an image blob for OCR:
 *  1. Upscale to at least MIN_WIDTH (small images produce terrible OCR)
 *  2. Convert to grayscale
 *  3. Stretch contrast (make darks darker, lights lighter)
 *  4. Binarize with adaptive threshold (clean black-on-white text)
 *
 * Returns a new PNG Blob ready for Tesseract.
 */
export async function preprocessImage(blob: Blob): Promise<Blob> {
    const img = await loadImage(blob);
    const MIN_WIDTH = 2500; // Increased resolution for better separation

    // --- Determine output dimensions (upscale small images) ---
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w < MIN_WIDTH) {
        const scale = MIN_WIDTH / w;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // Draw upscaled image
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    // --- Pixel-level processing ---
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data; // RGBA flat array

    // Pass 1: Convert to grayscale and collect histogram
    const gray = new Uint8Array(w * h);
    const histogram = new Uint32Array(256);

    for (let i = 0; i < gray.length; i++) {
        const ri = i * 4;
        // Luminance formula (perceptual weights)
        const g = Math.round(0.299 * d[ri] + 0.587 * d[ri + 1] + 0.114 * d[ri + 2]);
        gray[i] = g;
        histogram[g]++;
    }

    // Pass 2: Contrast stretch — map [lowPct, highPct] → [0, 255]
    const totalPixels = w * h;
    const lowCut = Math.round(totalPixels * 0.01);  // bottom 1%
    const highCut = Math.round(totalPixels * 0.99); // top 1%

    let cumulative = 0;
    let lo = 0;
    for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        if (cumulative >= lowCut) { lo = i; break; }
    }

    cumulative = 0;
    let hi = 255;
    for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        if (cumulative >= highCut) { hi = i; break; }
    }

    if (hi <= lo) { lo = 0; hi = 255; } // safety

    const range = hi - lo || 1;

    for (let i = 0; i < gray.length; i++) {
        // Stretch
        let v = Math.round(((gray[i] - lo) / range) * 255);
        v = Math.max(0, Math.min(255, v));
        gray[i] = v;
    }

    // Pass 3: Otsu's threshold for binarization
    const threshold = otsuThreshold(gray);

    // Apply binarization
    // We'll keep the binary data in `gray` for projection analysis
    // and also update `imageData` for the canvas (visual feedback if needed)
    for (let i = 0; i < gray.length; i++) {
        const val = gray[i] > threshold ? 255 : 0;
        gray[i] = val; // Store binary 0/255 in gray array

        const ri = i * 4;
        d[ri] = val;
        d[ri + 1] = val;
        d[ri + 2] = val;
        d[ri + 3] = 255;
    }

    // --- ROW SEGMENTATION & RE-STITCHING ---
    // Instead of OCRing the whole block (which merges rows),
    // we detect text rows and paste them onto a new canvas with spacing.

    // 1. Horizontal Projection Logic
    // Count black pixels in each row
    const projection = new Uint32Array(h);
    for (let y = 0; y < h; y++) {
        let blackCount = 0;
        for (let x = 0; x < w; x++) {
            if (gray[y * w + x] === 0) blackCount++;
        }
        projection[y] = blackCount;
    }

    // 2. Find row segments
    // A "row" is a contiguous run of lines with enough black pixels.
    const segments: { start: number; end: number }[] = [];
    let inSegment = false;
    let startY = 0;

    // Threshold: a line must have at least 0.5% of width as black pixels to count as text
    // This filters out grid lines if they are faint, or noise.
    // If grid lines are thick, they might be detected as rows, which is actually fine 
    // as long as the text is also detected.
    const ROW_THRESHOLD = Math.max(5, w * 0.005);

    for (let y = 0; y < h; y++) {
        const isContent = projection[y] > ROW_THRESHOLD;

        if (!inSegment && isContent) {
            inSegment = true;
            startY = y;
        } else if (inSegment && !isContent) {
            // End of segment
            // Filter out tiny specks (noise)
            if (y - startY > 10) {
                segments.push({ start: startY, end: y });
            }
            inSegment = false;
        }
    }
    if (inSegment && h - startY > 10) {
        segments.push({ start: startY, end: h });
    }

    // 3. Re-stitch onto a new canvas
    // We add vertical padding between rows to force Tesseract to see them as lines.
    const PADDING = 60; // Huge padding to guarantee separation through full page segmentation
    const newHeight = segments.reduce((acc, seg) => acc + (seg.end - seg.start) + PADDING, PADDING);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = w;
    outCanvas.height = Math.max(h, newHeight); // At least original height
    const outCtx = outCanvas.getContext("2d")!;

    // Fill white background
    outCtx.fillStyle = "#FFFFFF";
    outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    // Copy segments
    let currentY = PADDING;
    // We use the binarized imageData from the first canvas

    // Put the binarized data back to the first canvas so we can slice from it
    ctx.putImageData(imageData, 0, 0);

    for (const seg of segments) {
        const hC = seg.end - seg.start;
        // Draw slice
        outCtx.drawImage(canvas,
            0, seg.start, w, hC,
            0, currentY, w, hC
        );
        currentY += hC + PADDING;
    }

    // Export as PNG blob
    return new Promise((resolve, reject) => {
        outCanvas.toBlob((b) => {
            if (!b) return reject(new Error("Failed to export preprocessed image"));
            resolve(b);
        }, "image/png");
    });
}

/**
 * Otsu's method — finds the optimal threshold to separate foreground/background
 * by maximizing inter-class variance.
 */
function otsuThreshold(gray: Uint8Array): number {
    const hist = new Uint32Array(256);
    for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

    const total = gray.length;
    let sumAll = 0;
    for (let i = 0; i < 256; i++) sumAll += i * hist[i];

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let bestT = 128;

    for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;

        sumB += t * hist[t];
        const meanB = sumB / wB;
        const meanF = (sumAll - sumB) / wF;
        const variance = wB * wF * (meanB - meanF) * (meanB - meanF);

        if (variance > maxVariance) {
            maxVariance = variance;
            bestT = t;
        }
    }

    return bestT;
}

/**
 * Automatically detect the result table bounds in the image
 * Returns { x, y, width, height } in image coordinates (pixels)
 */
/**
 * Automatically detect the result table bounds in the image using Edge Detection.
 * Returns { x, y, width, height } in image coordinates (pixels)
 */
export async function getAutoCropRect(blob: Blob): Promise<{ x: number, y: number, width: number, height: number }> {
    const img = await loadImage(blob);
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    // We do this analysis on a smaller scale for speed (max width 800)
    const ANALYSIS_WIDTH = 800;
    const scale = Math.min(1, ANALYSIS_WIDTH / w);
    const sw = Math.round(w * scale);
    const sh = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, sw, sh);

    const imageData = ctx.getImageData(0, 0, sw, sh);
    const d = imageData.data;

    // 1. Edge Detection (Simple gradient)
    // We want to find horizontal lines and vertical lines.

    // Arrays to store "edge strength" projection
    const hEdges = new Uint32Array(sh); // Sum of horizontal edge strengths per row
    const vEdges = new Uint32Array(sw); // Sum of vertical edge strengths per col

    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const i = (y * sw + x) * 4;
            // Luminance
            const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;

            // Right neighbor
            const iRight = (y * sw + Math.min(x + 1, sw - 1)) * 4;
            const lumRight = (d[iRight] + d[iRight + 1] + d[iRight + 2]) / 3;

            // Bottom neighbor
            const iBottom = (Math.min(y + 1, sh - 1) * sw + x) * 4;
            const lumBottom = (d[iBottom] + d[iBottom + 1] + d[iBottom + 2]) / 3;

            const vDiff = Math.abs(lum - lumRight); // Vertical edge (change in X)
            const hDiff = Math.abs(lum - lumBottom); // Horizontal edge (change in Y)

            // Threshold to ignore noise
            if (vDiff > 15) vEdges[x] += vDiff;
            if (hDiff > 15) hEdges[y] += hDiff;
        }
    }

    // 2. Analyze Horizontal Projection to find Table Rows
    // We look for a "dense region" of horizontal lines.
    // Heuristic: A table has multiple horizontal lines. Banners usually have just 1 or 2.

    // Smooth the projection? No, lines are sharp.
    // Find "peaks" in hEdges.
    const peakThreshold = sw * 20; // Heuristic: average edge diff of 20 across full width

    let firstLineY = -1;
    let lastLineY = -1;
    let lineCount = 0;

    // Scan top to bottom
    // We want to skip the header image (logo etc).
    // Tables usually start after top 15%? but maybe not.

    const potentialLines: number[] = [];
    for (let y = 0; y < sh; y++) {
        if (hEdges[y] > peakThreshold) {
            potentialLines.push(y);
        }
    }

    // Filter lines: grouped lines count as 1.
    const distinctLines: number[] = [];
    if (potentialLines.length > 0) {
        distinctLines.push(potentialLines[0]);
        for (let i = 1; i < potentialLines.length; i++) {
            if (potentialLines[i] - potentialLines[i - 1] > 5) { // at least 5px apart
                distinctLines.push(potentialLines[i]);
            }
        }
    }

    // Heuristic: The result table has many lines (rows). 
    // We want the block with the MOST lines.
    if (distinctLines.length >= 2) {
        // Assume the table starts at the first line and ends at the last line 
        // IF there are enough lines between them relative to distance?
        // Let's just take the bounding box of ALL significant horizontal lines 
        // that are somewhat grouped.

        // Actually, often there are lines in the header (under logo).
        // The table is usually the largest chunk.

        // Simple approach: First and Last distinct lines.
        firstLineY = distinctLines[0];
        lastLineY = distinctLines[distinctLines.length - 1];

        // Refinement: If the first line is way above the second (header underline), skip it.
        // If dist(0, 1) > 2 * avg_dist, maybe 0 is a header line?
        // Let's safe-bet: include it. The crop can be slightly loose.
    } else {
        // Fallback: Use middle 50%
        firstLineY = sh * 0.25;
        lastLineY = sh * 0.75;
    }

    // 3. Analyze Vertical Projection (within the rows)
    // Find Left and Right bounds.
    let leftX = 0;
    let rightX = sw;

    const vPeakThreshold = (lastLineY - firstLineY) * 20;

    // Scan from left
    for (let x = 0; x < sw / 2; x++) {
        if (vEdges[x] > vPeakThreshold) { leftX = x; break; }
    }
    // Scan from right
    for (let x = sw - 1; x > sw / 2; x--) {
        if (vEdges[x] > vPeakThreshold) { rightX = x; break; }
    }

    // If we failed to find vertical edges (e.g. no vertical grid lines), 
    // check for TEXT content density instead? 
    // Assuming the table lines are strong enough.

    // 4. Map back
    const PADDING = 10;

    const finalX = Math.max(0, Math.floor(leftX / scale) - PADDING);
    const finalY = Math.max(0, Math.floor(firstLineY / scale) - PADDING);
    const finalR = Math.min(w, Math.ceil(rightX / scale) + PADDING);
    const finalB = Math.min(h, Math.ceil(lastLineY / scale) + PADDING);

    // Sanity check: Needs to be big enough
    if ((finalR - finalX) < 100 || (finalB - finalY) < 100) {
        // Return full image if detection seems broken
        return { x: 0, y: 0, width: w, height: h };
    }

    return {
        x: finalX,
        y: finalY,
        width: finalR - finalX,
        height: finalB - finalY
    };
}   