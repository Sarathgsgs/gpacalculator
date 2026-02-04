import React from "react";
import QuickCgpa from "../../components/QuickCgpa.js";
import DetailedCgpa from "../../components/DetailedCgpa.js";
import SemesterCreditsReference from "../../components/SemesterCreditsReference.js";
import Disclaimer from "../../components/Disclaimer.js";

export default function Cgpa() {
  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text md:text-4xl">
          CGPA Calculator
        </h1>
        <p className="mt-2 text-sm text-muted">
          Calculate your cumulative standing using quick entry or detailed semester breakdown.
        </p>
      </div>

      <div className="mt-8 grid gap-6">
        <QuickCgpa />

        {/* NEW: credits reference under quick CGPA */}
        <SemesterCreditsReference />

        <DetailedCgpa />
      </div>

      <Disclaimer />
    </div>
  );
}