import React, { useEffect, useMemo } from "react";
import { round2 } from "../utils/grading";

function performanceMeta(gpa: number) {
    if (gpa >= 9) {
        return {
            level: "Outstanding",
            title: "Excellent Achievement!",
            desc: "Outstanding performance this semester. You’ve maintained a very high academic standard."
        };
    }
    if (gpa >= 8) {
        return {
            level: "Excellent",
            title: "Great Work!",
            desc: "Strong results. Keep up the consistency to push into the top tier."
        };
    }
    if (gpa >= 7) {
        return {
            level: "Very Good",
            title: "Good Progress!",
            desc: "You’re doing well. A bit more focus can lift you to the next band."
        };
    }
    if (gpa >= 6) {
        return {
            level: "Good",
            title: "Solid Effort!",
            desc: "You’re on track. Identify weaker subjects and improve step-by-step."
        };
    }
    if (gpa >= 5) {
        return {
            level: "Average",
            title: "You Can Improve!",
            desc: "There’s room to grow—plan strategically and focus on fundamentals."
        };
    }
    return {
        level: "Needs Improvement",
        title: "Don’t Give Up!",
        desc: "Review your weak areas and create a recovery plan for the next semester."
    };
}

export default function GpaResultModal({
    open,
    gpa,
    onClose,
    onRecalculate
}: {
    open: boolean;
    gpa: number;
    onClose: () => void;
    onRecalculate: () => void;
}) {
    const gpa2 = useMemo(() => round2(gpa), [gpa]);
    const meta = useMemo(() => performanceMeta(gpa2), [gpa2]);
    const percent = Math.max(0, Math.min(100, (gpa2 / 10) * 100));

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
                // close if clicking backdrop only
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
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
                        <span className="text-accent text-lg font-black">🏆</span>
                    </div>

                    <div className="mt-4 text-xs font-semibold tracking-[0.25em] text-muted">
                        SEMESTER RESULT OVERVIEW
                    </div>

                    <div className="mt-4 text-6xl font-extrabold tracking-tight text-text">
                        {gpa2.toFixed(2)}
                        <span className="ml-2 text-xl font-semibold text-muted">/ 10.00</span>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-muted">
                            <span>PERFORMANCE LEVEL</span>
                            <span className="text-accent">{meta.level}</span>
                        </div>

                        <div className="mt-3 h-2 w-full rounded-full bg-white/5 ring-1 ring-border overflow-hidden">
                            <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>

                    <h3 className="mt-7 text-2xl font-extrabold text-text">{meta.title}</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                        {meta.desc}
                    </p>
                </div>

                <div className="border-t border-border/70 bg-bg/20 px-8 py-5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Projected CGPA</span>
                        <span className="font-semibold text-text">{gpa2.toFixed(2)}</span>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow hover:brightness-110"
                        >
                            Save Result
                        </button>
                        <button
                            type="button"
                            onClick={onRecalculate}
                            className="flex-1 rounded-2xl bg-white/5 px-5 py-3 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
                        >
                            Recalculate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}