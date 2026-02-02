import React from "react";

export default function SemesterSelect({
  value,
  onChange,
  disabled
}: {
  value: number;
  onChange: (semester: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wider text-muted">SELECT SEMESTER</span>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text shadow-glow outline-none focus:border-accent/50 focus:ring-0 disabled:opacity-60 md:w-56"
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
    </div>
  );
}