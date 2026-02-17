import React, { useMemo } from "react";

export type SemesterCreditsRow = { semester: number; totalCredits: number };

function formatCredits(n: number) {
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(1);
}

export default function SemesterCreditsReference({
  rows,
  loading,
  error
}: {
  rows: SemesterCreditsRow[];
  loading: boolean;
  error: string | null;
}) {
  const map = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.semester, r.totalCredits);
    return m;
  }, [rows]);

  return (
    <section className="rounded-3xl border border-border/70 bg-panel/40 p-6 shadow-glow">
      <div>
        <h3 className="text-base font-bold text-text">Semester Credits Reference</h3>
        <p className="mt-1 text-sm text-muted">
          Total <span className="text-text font-semibold">credit</span> count per semester (non-credit excluded).
        </p>
      </div>

      <div className="mt-4">
        {loading && (
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 text-sm text-muted">
            Loading semester credits…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 text-sm text-muted">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => {
              const sem = i + 1;
              const credits = map.get(sem);

              return (
                <div
                  key={sem}
                  className="rounded-2xl border border-border/70 bg-surface/60 p-4"
                >
                  <div className="text-xs font-semibold tracking-widest text-muted">
                    SEMESTER {sem}
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-text">
                    {credits === undefined ? (
                      <span className="text-muted">--</span>
                    ) : (
                      <span className="text-accent">{formatCredits(credits)}</span>
                    )}
                    <span className="ml-2 text-sm font-semibold text-muted">credits</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}