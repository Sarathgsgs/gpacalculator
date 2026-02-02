import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-bg">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-center text-xs text-muted md:px-6">
        <div className="mx-auto max-w-3xl">
          <h3>Made by Heisenberg</h3>
          <p className="leading-relaxed">
            Disclaimer: Calculated using standard credit-weighted rules. Final GPA/CGPA may vary
            slightly due to university rounding policies. Please verify with your official mark
            sheet/result portal.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span>© {new Date().getFullYear()} </span>
            <span className="opacity-50">•</span>
            <span>No login • No tracking • No student data stored</span>
          </div>
        </div>
      </div>
    </footer>
  );
}