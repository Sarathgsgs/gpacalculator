import React from "react";

export default function Disclaimer() {
  return (
    <div className="mt-6 rounded-2xl border border-border/70 bg-surface/60 p-4 text-sm text-muted">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-xl bg-accent/15 ring-1 ring-accent/20" />
        <p className="leading-relaxed">
          <span className="text-text">Disclaimer:</span> GPA/CGPA shown here is an estimate based on
          standard credit-weighted computation. Final values may vary slightly due to
          university-specific rounding policies.
        </p>
      </div>
    </div>
  );
}