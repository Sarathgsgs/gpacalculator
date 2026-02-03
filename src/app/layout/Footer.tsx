import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-bg">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 text-center md:px-6">
        {/* Disclaimer */}
        <p className="mx-auto max-w-3xl text-xs leading-relaxed text-muted">
          Disclaimer: Calculated using standard credit-weighted rules. Final GPA/CGPA may vary
          slightly due to university rounding policies. Please verify with your official mark
          sheet/result portal.
        </p>

        {/* Made by */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted">
          <img
            src="/heisenberg.png"
            alt="Creator mark"
            className="h-7 w-7 rounded-lg object-cover opacity-90"
            loading="lazy"
          />
          <span>
            Made by <span className="font-semibold text-text">Heisenberg</span>
          </span>
        </div>

        {/* Copyright + privacy */}
        <div className="mt-4 text-[11px] text-muted">
          <span>© {new Date().getFullYear()}</span>
          <span className="mx-2 opacity-50">•</span>
          <span>No login</span>
          <span className="mx-2 opacity-50">•</span>
          <span>No tracking</span>
          <span className="mx-2 opacity-50">•</span>
          <span>No student data stored</span>
        </div>
      </div>
    </footer>
  );
}