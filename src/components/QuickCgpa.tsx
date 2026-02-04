import React, { useMemo, useState } from "react";
import { computeQuickCgpa, round2 } from "../utils/grading.js";

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold tracking-widest text-muted">{label}</span>
      <input
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent/50"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function QuickCgpa() {
  const [prevCgpa, setPrevCgpa] = useState("");
  const [prevCredits, setPrevCredits] = useState("");
  const [currentGpa, setCurrentGpa] = useState("");
  const [currentCredits, setCurrentCredits] = useState("");

  const result = useMemo(() => {
    const cgpa = computeQuickCgpa(
      Number(prevCgpa),
      Number(prevCredits),
      Number(currentGpa),
      Number(currentCredits)
    );
    return cgpa === null ? null : round2(cgpa);
  }, [prevCgpa, prevCredits, currentGpa, currentCredits]);

  const canShow = result !== null;

  const onClear = () => {
    setPrevCgpa("");
    setPrevCredits("");
    setCurrentGpa("");
    setCurrentCredits("");
  };

  return (
    <section className="rounded-3xl border border-border/70 bg-panel/40 p-6 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text">Quick CGPA Calculator</h2>
          <p className="mt-1 text-sm text-muted">
            Enter previous CGPA + credits and current semester GPA + credits.
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
        >
          Clear
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Field label="PREVIOUS CGPA" value={prevCgpa} onChange={setPrevCgpa} placeholder="e.g., 8.5" />
        <Field label="PREVIOUS TOTAL CREDITS" value={prevCredits} onChange={setPrevCredits} placeholder="e.g., 80" />
        <Field label="CURRENT GPA" value={currentGpa} onChange={setCurrentGpa} placeholder="e.g., 9.0" />
        <Field label="CURRENT SEM CREDITS" value={currentCredits} onChange={setCurrentCredits} placeholder="e.g., 24" />
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-surface/60 p-5">
        <div className="text-xs font-semibold tracking-widest text-muted">RESULT</div>
        <div className="mt-1 text-3xl font-extrabold text-text">
          {canShow ? (
            <span className="text-accent">{result!.toFixed(2)}</span>
          ) : (
            <span className="text-muted">--</span>
          )}
          <span className="ml-2 text-base font-semibold text-muted">/ 10.00</span>
        </div>
      </div>
    </section>
  );
}