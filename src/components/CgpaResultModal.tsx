import React, { useEffect, useMemo } from "react";
import { round2 } from "../utils/grading";

function performanceMeta(cgpa: number) {
  if (cgpa >= 9) {
    return {
      level: "Outstanding",
      title: "Excellent Achievement!",
      desc: "Outstanding cumulative performance. You’re in the top band—keep it consistent."
    };
  }
  if (cgpa >= 8) {
    return {
      level: "Excellent",
      title: "Great Work!",
      desc: "Strong cumulative results. A little push can take you to the highest tier."
    };
  }
  if (cgpa >= 7) {
    return {
      level: "Very Good",
      title: "Good Progress!",
      desc: "You’re doing well overall. Improve a few subjects to climb further."
    };
  }
  if (cgpa >= 6) {
    return {
      level: "Good",
      title: "Solid Effort!",
      desc: "You’re on track. A consistent plan can boost your next semester."
    };
  }
  if (cgpa >= 5) {
    return {
      level: "Average",
      title: "You Can Improve!",
      desc: "There’s room to grow. Focus on fundamentals and scoring subjects."
    };
  }
  return {
    level: "Needs Improvement",
    title: "Don’t Give Up!",
    desc: "Build a recovery plan and improve steadily in upcoming semesters."
  };
}

export default function CgpaResultModal({
  open,
  cgpa,
  onClose
}: {
  open: boolean;
  cgpa: number;
  onClose: () => void;
}) {
  const cgpa2 = useMemo(() => round2(cgpa), [cgpa]);
  const meta = useMemo(() => performanceMeta(cgpa2), [cgpa2]);
  const percent = Math.max(0, Math.min(100, (cgpa2 / 10) * 100));

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-xl rounded-3xl border border-border/70 bg-surface/90 shadow-glow">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-muted ring-1 ring-border hover:bg-white/10 hover:text-text"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
            <span className="text-accent text-lg font-black">∑</span>
          </div>

          <div className="mt-4 text-xs font-semibold tracking-[0.25em] text-muted">
            CUMULATIVE RESULT OVERVIEW
          </div>

          <div className="mt-4 text-6xl font-extrabold tracking-tight text-text">
            {cgpa2.toFixed(2)}
            <span className="ml-2 text-xl font-semibold text-muted">/ 10.00</span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-muted">
              <span>PERFORMANCE LEVEL</span>
              <span className="text-accent">{meta.level}</span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-border">
              <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <h3 className="mt-7 text-2xl font-extrabold text-text">{meta.title}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{meta.desc}</p>
        </div>

        <div className="border-t border-border/70 bg-bg/20 px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow hover:brightness-110"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}