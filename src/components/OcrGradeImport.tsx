import React, { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Course, Grade } from "../utils/types";
import { extractGradesForCourses, countMatches } from "../utils/ocrGrades";

type Props = {
  courses: Course[];
  onApply: (grades: Record<string, Grade>) => void;
};

type Stage = "idle" | "cropping" | "ocr" | "review";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, cropPixels: any): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Failed to crop image"));
      resolve(blob);
    }, "image/png");
  });
}

function StepPill({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold ring-1",
        done
          ? "bg-accent/15 text-accent ring-accent/25"
          : active
            ? "bg-white/10 text-text ring-border"
            : "bg-white/5 text-muted ring-border"
      )}
    >
      {label}
    </div>
  );
}

export default function OcrGradeImport({ courses, onApply }: Props) {
  const courseCodes = useMemo(() => courses.map((c) => c.courseCode), [courses]);

  const [stage, setStage] = useState<Stage>("idle");
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const [fileName, setFileName] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  // crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const cropPixelsRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // result
  const [extracted, setExtracted] = useState<Record<string, Grade>>({});
  const [extractedText, setExtractedText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const matches = countMatches(extracted);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const resetAll = () => {
    setStage("idle");
    setBusy(false);
    setStatus("");
    setProgress(0);
    setFileName("");
    setExtracted({});
    setExtractedText("");
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function runOcrOnCropped(overrideUrl?: string, overridePixels?: any) {
    const src = overrideUrl || imageUrl;
    const pixels = overridePixels || cropPixelsRef.current;

    if (!src || !pixels) return;

    setBusy(true);
    setError(null);
    setExtracted({});
    setStage("ocr");
    setStatus("Cropping image…");
    setProgress(5);

    try {
      const croppedBlob = await getCroppedBlob(src, pixels);

      setStatus("Preprocessing image…");
      setProgress(10);

      // Preprocess: grayscale → contrast stretch → binarize → upscale
      const { preprocessImage } = await import("../utils/imagePreprocess");
      const cleanBlob = await preprocessImage(croppedBlob);

      setStatus("Preparing OCR engine…");
      setProgress(15);

      const Tesseract = await import("tesseract.js");

      // Helper: run Tesseract with a given PSM mode
      const runTesseract = async (psm: string) => {
        const worker = await Tesseract.createWorker("eng", undefined, {
          logger: (m: any) => {
            if (m?.status === "loading tesseract core") setStatus("Preparing OCR engine…");
            if (m?.status === "initializing tesseract") setStatus("Initializing OCR…");
            if (m?.status === "loading language traineddata") setStatus("Loading language data…");
            if (m?.status === "recognizing text") setStatus("Extracting text from image…");

            if (typeof m?.progress === "number") {
              const p = Math.round(20 + m.progress * 70);
              setProgress(p);
            }
          }
        });

        await worker.setParameters({
          tessedit_pageseg_mode: psm as any,
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+. ",
        });

        const { data } = await worker.recognize(cleanBlob);
        await worker.terminate();
        return data?.text || "";
      };

      // Try SINGLE_BLOCK (mode 6) — best for full tables
      setStatus("Extracting text (pass 1)…");
      const text1 = await runTesseract(Tesseract.PSM.SINGLE_BLOCK);

      const found1 = extractGradesForCourses(text1, courseCodes);

      let finalText = text1;
      let finalFound = found1;

      // If we matched fewer than half, try SPARSE_TEXT (mode 11) as a second pass
      if (countMatches(found1) < Math.ceil(courseCodes.length / 2)) {
        setStatus("Extracting text (pass 2)…");
        setProgress(80);
        const text2 = await runTesseract(Tesseract.PSM.SPARSE_TEXT);
        const found2 = extractGradesForCourses(text2, courseCodes);

        // Merge: pick whichever pass found more
        if (countMatches(found2) > countMatches(found1)) {
          finalText = text2;
          finalFound = found2;
        } else {
          // Merge any extra matches from pass 2
          for (const [code, grade] of Object.entries(found2)) {
            if (!finalFound[code]) finalFound[code] = grade;
          }
        }
      }

      setStatus("Matching courses & grades…");
      setProgress(95);

      setExtractedText(finalText); // Store for debugging
      setExtracted(finalFound);
      setStage("review");
      setStatus("");
      setProgress(100);

      if (countMatches(finalFound) === 0) {
        setError(
          courseCodes.length === 0
            ? "No courses loaded. Please select a semester first, then try OCR."
            : "No grades matched. Ensure you have the correct semester loaded. Try cropping tighter (only the table), or upload a clearer screenshot."
        );
      }
    } catch (e) {
      console.error(e);
      setError("OCR failed. Try a clearer/cropped table screenshot.");
      setStage("cropping");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-border/70 bg-panel/40 p-5 shadow-glow">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-text">Import grades from screenshot (OCR)</h3>
        <p className="text-sm text-muted">
          Upload a screenshot, crop to the results table, then we’ll auto-fill grades. Runs on your
          device (not uploaded).
        </p>
      </div>

      {/* Steps */}
      <div className="mt-4 flex flex-wrap gap-2">
        <StepPill active={stage === "idle"} done={stage !== "idle"} label="1. Upload" />
        <StepPill active={stage === "cropping"} done={stage === "ocr" || stage === "review"} label="2. Crop" />
        <StepPill active={stage === "ocr"} done={stage === "review"} label="3. Extract" />
        <StepPill active={stage === "review"} done={false} label="4. Review & Apply" />
      </div>

      {/* Upload */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={busy || courses.length === 0}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;

            setError(null);
            setExtracted({});
            setExtractedText("");
            setFileName(f.name);

            if (imageUrl) URL.revokeObjectURL(imageUrl);
            const url = URL.createObjectURL(f);
            setImageUrl(url);

            setStage("cropping");

            // Trigger Auto-Crop
            setStatus("Detecting table...");
            try {
              const { getAutoCropRect } = await import("../utils/imagePreprocess");
              const rect = await getAutoCropRect(f);

              console.log("Auto-detected crop:", rect);

              // If we found a reasonable rect (not the whole image)
              // We bypass manual crop
              if (rect.width > 50 && rect.height > 50) {
                cropPixelsRef.current = rect;

                // We need to trigger the OCR run.
                // We pass the URL and rect explicitly because state might not be settled.
                await runOcrOnCropped(url, rect);
                return;
              }

            } catch (e) {
              console.warn("Auto-crop failed, falling back to manual", e);
            }
          }}
          className="block w-full text-sm text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-white/5 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text file:ring-1 file:ring-border hover:file:bg-white/10"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetAll}
            disabled={busy && stage === "ocr"}
            className={cn(
              "rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-border",
              "hover:bg-white/10",
              busy && stage === "ocr" && "cursor-not-allowed opacity-60"
            )}
          >
            Reset OCR
          </button>

          <button
            type="button"
            disabled={busy || stage !== "review" || matches === 0}
            onClick={() => onApply(extracted)}
            className={cn(
              "rounded-2xl px-5 py-2 text-sm font-semibold shadow-glow",
              busy || stage !== "review" || matches === 0
                ? "cursor-not-allowed bg-white/10 text-muted"
                : "bg-accent text-bg hover:brightness-110"
            )}
            title={matches === 0 ? "No matched grades yet." : ""}
          >
            Apply {matches ? `(${matches})` : ""}
          </button>
        </div>
      </div>

      {/* Cropping UI */}
      {stage === "cropping" && imageUrl && (
        <div className="mt-5 rounded-3xl border border-border/70 bg-surface/50 p-4">
          <div className="text-sm text-muted">
            File: <span className="text-text font-semibold">{fileName}</span>
          </div>

          <div className="relative mt-4 h-[340px] overflow-hidden rounded-2xl border border-border/70 bg-bg">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedAreaPixels) => {
                cropPixelsRef.current = croppedAreaPixels;
              }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3 text-sm text-muted">
              <span className="w-14 text-xs font-semibold tracking-widest text-muted">ZOOM</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full md:w-72"
              />
            </label>

            <button
              type="button"
              onClick={() => runOcrOnCropped()}
              disabled={busy}
              className={cn(
                "rounded-2xl px-5 py-3 text-sm font-semibold shadow-glow",
                busy ? "cursor-not-allowed bg-white/10 text-muted" : "bg-accent text-bg hover:brightness-110"
              )}
            >
              Crop & Extract Grades
            </button>
          </div>
        </div>
      )}

      {/* OCR loading */}
      {stage === "ocr" && (
        <div className="mt-5 rounded-3xl border border-border/70 bg-surface/50 p-5">
          <div className="text-sm font-semibold text-text">OCR in progress</div>
          <div className="mt-1 text-sm text-muted">{status || "Working…"}</div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-border">
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-2 text-xs text-muted">{progress}%</div>
        </div>
      )}

      {/* Review */}
      {stage === "review" && (
        <div className="mt-5 rounded-3xl border border-border/70 bg-surface/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text">Detected grades</div>
              <div className="mt-1 text-sm text-muted">
                Matched <span className="text-text font-semibold">{matches}</span> /{" "}
                <span className="text-text font-semibold">{courses.length}</span> courses.
              </div>
              {extractedText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted hover:text-text">
                    Show extracted text (debug)
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-bg/60 p-2 text-xs text-muted">
                    {extractedText}
                  </pre>
                </details>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStage("cropping");
                setError(null);
                setExtracted({});
                setExtractedText("");
              }}
              className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
            >
              Re-crop
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-bg/40 p-4 text-sm text-muted">
              {error}
            </div>
          )}

          {matches > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(extracted)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([code, grade]) => (
                  <div
                    key={code}
                    className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-2 ring-1 ring-border"
                  >
                    <span className="text-text font-semibold">{code}</span>
                    <span className="text-accent font-extrabold">{grade}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}     