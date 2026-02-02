import React, { useMemo, useState } from "react";
import type { SemesterEntry } from "../utils/types";
import { computeDetailedCgpa, round2 } from "../utils/grading";

function NumberField({
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

export default function DetailedCgpa() {
  const [sem, setSem] = useState("");
  const [gpa, setGpa] = useState("");
  const [credits, setCredits] = useState("");
  const [entries, setEntries] = useState<SemesterEntry[]>([]);

  const cgpa = useMemo(() => {
    const val = computeDetailedCgpa(entries);
    return val === null ? null : round2(val);
  }, [entries]);

  const add = () => {
    const semester = Number(sem);
    const gpaNum = Number(gpa);
    const creditsNum = Number(credits);

    if (!Number.isFinite(semester) || semester < 1 || semester > 8) return;
    if (!Number.isFinite(gpaNum) || gpaNum < 0 || gpaNum > 10) return;
    if (!Number.isFinite(creditsNum) || creditsNum < 0) return;

    setEntries((prev) => {
      // Replace if semester exists
      const filtered = prev.filter((e) => e.semester !== semester);
      return [...filtered, { semester, gpa: gpaNum, credits: creditsNum }].sort(
        (a, b) => a.semester - b.semester
      );
    });

    setSem("");
    setGpa("");
    setCredits("");
  };

  const remove = (semester: number) => {
    setEntries((prev) => prev.filter((e) => e.semester !== semester));
  };

  const clearAll = () => setEntries([]);

  return (
    <section className="rounded-3xl border border-border/70 bg-panel/40 p-6 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text">Detailed CGPA Calculator</h2>
          <p className="mt-1 text-sm text-muted">
            Add semester-wise GPA and credits. CGPA updates automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={clearAll}
          className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
        >
          Clear all
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4 md:items-end">
        <NumberField label="SEMESTER" value={sem} onChange={setSem} placeholder="1-8" />
        <NumberField label="GPA" value={gpa} onChange={setGpa} placeholder="0-10" />
        <NumberField label="CREDITS" value={credits} onChange={setCredits} placeholder="e.g., 24" />

        <button
          type="button"
          onClick={add}
          className="rounded-2xl bg-white/5 px-5 py-3 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
        >
          + Add Semester
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-surface/60 p-5">
        <div className="text-xs font-semibold tracking-widest text-muted">CGPA</div>
        <div className="mt-1 text-3xl font-extrabold text-text">
          {cgpa === null ? (
            <span className="text-muted">--</span>
          ) : (
            <span className="text-accent">{cgpa.toFixed(2)}</span>
          )}
          <span className="ml-2 text-base font-semibold text-muted">/ 10.00</span>
        </div>
      </div>

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-surface/40 p-8 text-center text-sm text-muted">
            No semester data added yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {entries.map((e) => (
              <div
                key={e.semester}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-surface/60 p-4 md:flex-row md:items-center"
              >
                <div className="text-sm text-text">
                  <span className="font-semibold">Semester {e.semester}</span>
                  <span className="ml-3 text-muted">
                    GPA: <span className="text-text font-semibold">{e.gpa.toFixed(2)}</span>
                  </span>
                  <span className="ml-3 text-muted">
                    Credits: <span className="text-text font-semibold">{e.credits}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => remove(e.semester)}
                  className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10 md:w-auto"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}