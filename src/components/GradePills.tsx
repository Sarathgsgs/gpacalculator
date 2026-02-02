import React from "react";
import type { Grade } from "../utils/types";
import { GRADES } from "../utils/grading";

export default function GradePills({
  value,
  onChange,
  disabled
}: {
  value: Grade | null;
  onChange: (g: Grade) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Select grade"
      className={[
        "flex flex-wrap items-center justify-end gap-2",
        disabled ? "opacity-60" : ""
      ].join(" ")}
    >
      {GRADES.map((g) => {
        const selected = value === g;
        return (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(g)}
            className={[
              "min-w-10 rounded-xl px-3 py-2 text-xs font-semibold tracking-wide ring-1 transition",
              selected
                ? "bg-accent text-bg ring-accent/40"
                : "bg-bg/20 text-muted ring-border hover:bg-white/5 hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            ].join(" ")}
          >
            {g}
          </button>
        );
      })}
    </div>
  );
}