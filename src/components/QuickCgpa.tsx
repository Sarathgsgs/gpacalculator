import React, { useEffect, useMemo, useState } from "react";
import { computeQuickCgpa, round2 } from "../utils/grading";
import CgpaResultModal from "./CgpaResultModal";

export type SemesterCreditsRow = { semester: number; totalCredits: number };

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold tracking-widest text-muted">{label}</span>
      <input
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent/50 disabled:opacity-60"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function formatCreditsInput(n: number) {
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(1);
}

function computeAutoCredits(map: Map<number, number>, resultSemester: number) {
  const missingPrev: number[] = [];
  let prev = 0;

  for (let s = 1; s <= resultSemester - 1; s++) {
    const v = map.get(s);
    if (v === undefined) missingPrev.push(s);
    else prev += v;
  }

  const current = map.get(resultSemester);
  const missingCurrent = current === undefined ? [resultSemester] : [];

  return {
    prevCredits: missingPrev.length ? null : prev,
    currentCredits: missingCurrent.length ? null : current!,
    missingPrev,
    missingCurrent
  };
}

export default function QuickCgpa({
  semesterCredits,
  creditsLoading,
  creditsError
}: {
  semesterCredits: SemesterCreditsRow[];
  creditsLoading: boolean;
  creditsError: string | null;
}) {
  const creditsMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of semesterCredits) m.set(r.semester, r.totalCredits);
    return m;
  }, [semesterCredits]);

  // Default to semester 5 if available; else use max available; else 1
  const defaultResultSemester = useMemo(() => {
    if (creditsMap.has(5)) return 5;
    const max = Math.max(0, ...Array.from(creditsMap.keys()));
    return max > 0 ? max : 1;
  }, [creditsMap]);

  const [resultSemester, setResultSemester] = useState<number>(defaultResultSemester);
  const [overrideCredits, setOverrideCredits] = useState(false);

  const [prevCgpa, setPrevCgpa] = useState("");
  const [prevCredits, setPrevCredits] = useState("");
  const [currentGpa, setCurrentGpa] = useState("");
  const [currentCredits, setCurrentCredits] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCgpa, setModalCgpa] = useState(0);

  // Keep resultSemester synced when credits load changes default
  useEffect(() => {
    setResultSemester(defaultResultSemester);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultResultSemester]);

  const auto = useMemo(() => {
    return computeAutoCredits(creditsMap, resultSemester);
  }, [creditsMap, resultSemester]);

  // When not overriding, auto-fill + lock credits
  useEffect(() => {
    if (overrideCredits) return;

    setPrevCredits(auto.prevCredits === null ? "" : formatCreditsInput(auto.prevCredits));
    setCurrentCredits(auto.currentCredits === null ? "" : formatCreditsInput(auto.currentCredits));
  }, [overrideCredits, auto.prevCredits, auto.currentCredits]);

  const cgpaRaw = useMemo(() => {
    return computeQuickCgpa(
      Number(prevCgpa),
      Number(prevCredits),
      Number(currentGpa),
      Number(currentCredits)
    );
  }, [prevCgpa, prevCredits, currentGpa, currentCredits]);

  const result = useMemo(() => {
    return cgpaRaw === null ? null : round2(cgpaRaw);
  }, [cgpaRaw]);

  const onClear = () => {
    setPrevCgpa("");
    setCurrentGpa("");
    setOverrideCredits(false);
    setModalOpen(false);
    // credits fields will auto-fill again via effect
  };

  const creditsOk =
    !creditsLoading &&
    !creditsError &&
    auto.prevCredits !== null &&
    auto.currentCredits !== null;

  const showAutoWarning =
    !overrideCredits &&
    !creditsLoading &&
    !creditsError &&
    (auto.prevCredits === null || auto.currentCredits === null);

  return (
    <section className="rounded-3xl border border-border/70 bg-panel/40 p-6 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text">Quick CGPA Calculator</h2>
          <p className="mt-1 text-sm text-muted">
            Pick the result semester. Previous + current credits will be auto-filled.
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

      {/* Result semester + override */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 md:items-end">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-widest text-muted">RESULT SEMESTER</span>
          <select
            value={resultSemester}
            onChange={(e) => {
              setResultSemester(Number(e.target.value));
              setModalOpen(false);
            }}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent/50"
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const s = i + 1;
              return (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              );
            })}
          </select>
        </label>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/40 px-4 py-3">
          <div className="text-sm text-muted">
            Credits:{" "}
            {creditsLoading ? (
              <span className="text-muted">loading…</span>
            ) : creditsError ? (
              <span className="text-muted">unavailable</span>
            ) : creditsOk ? (
              <span className="text-text font-semibold">auto-filled</span>
            ) : (
              <span className="text-muted">missing (use override)</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOverrideCredits((v) => !v);
              setModalOpen(false);
            }}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-text ring-1 ring-border hover:bg-white/10"
          >
            {overrideCredits ? "Use auto credits" : "Override credits"}
          </button>
        </div>
      </div>

      {showAutoWarning && (
        <div className="mt-4 rounded-2xl border border-border/70 bg-surface/60 p-4 text-sm text-muted">
          Credits for{" "}
          {[
            ...(auto.missingPrev.length ? [`Sem ${auto.missingPrev.join(", ")}`] : []),
            ...(auto.missingCurrent.length ? [`Sem ${auto.missingCurrent.join(", ")}`] : [])
          ].join(" & ")}{" "}
          not found in DB. Turn on <span className="text-text font-semibold">Override credits</span>.
        </div>
      )}

      {/* Inputs */}
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Field
          label={`PREVIOUS CGPA (UP TO SEM ${Math.max(1, resultSemester - 1)})`}
          value={prevCgpa}
          onChange={(v) => {
            setPrevCgpa(v);
            setModalOpen(false);
          }}
          placeholder="e.g., 8.50"
        />

        <Field
          label={`PREVIOUS TOTAL CREDITS (SEM 1–${Math.max(1, resultSemester - 1)})`}
          value={prevCredits}
          onChange={(v) => {
            setPrevCredits(v);
            setModalOpen(false);
          }}
          placeholder={overrideCredits ? "e.g., 92" : creditsLoading ? "Loading…" : "Auto"}
          disabled={!overrideCredits}
        />

        <Field
          label={`CURRENT GPA (SEM ${resultSemester})`}
          value={currentGpa}
          onChange={(v) => {
            setCurrentGpa(v);
            setModalOpen(false);
          }}
          placeholder="e.g., 9.00"
        />

        <Field
          label={`CURRENT SEM CREDITS (SEM ${resultSemester})`}
          value={currentCredits}
          onChange={(v) => {
            setCurrentCredits(v);
            setModalOpen(false);
          }}
          placeholder={overrideCredits ? "e.g., 24" : creditsLoading ? "Loading…" : "Auto"}
          disabled={!overrideCredits}
        />
      </div>

      {/* Result */}
      <div className="mt-6 rounded-2xl border border-border/70 bg-surface/60 p-5">
        <div className="text-xs font-semibold tracking-widest text-muted">RESULT</div>
        <div className="mt-1 text-3xl font-extrabold text-text">
          {result === null ? (
            <span className="text-muted">--</span>
          ) : (
            <span className="text-accent">{result.toFixed(2)}</span>
          )}
          <span className="ml-2 text-base font-semibold text-muted">/ 10.00</span>
        </div>
      </div>

      {/* Action to open modal */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={cgpaRaw === null}
          onClick={() => {
            if (cgpaRaw === null) return;
            setModalCgpa(cgpaRaw);
            setModalOpen(true);
          }}
          className={[
            "rounded-2xl px-5 py-3 text-sm font-semibold shadow-glow",
            cgpaRaw === null
              ? "cursor-not-allowed bg-white/10 text-muted"
              : "bg-accent text-bg hover:brightness-110"
          ].join(" ")}
        >
          View CGPA Result
        </button>
      </div>

      <CgpaResultModal open={modalOpen} cgpa={modalCgpa} onClose={() => setModalOpen(false)} />
    </section>
  );
}