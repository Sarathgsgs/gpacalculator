import React, { useEffect, useState } from "react";
import QuickCgpa from "../../components/QuickCgpa";
import DetailedCgpa from "../../components/DetailedCgpa";
import SemesterCreditsReference from "../../components/SemesterCreditsReference";
import Disclaimer from "../../components/Disclaimer";

export type SemesterCreditsRow = { semester: number; totalCredits: number };

type SemesterCreditsApiResponse = {
  regulation: string;
  semesters: SemesterCreditsRow[];
};

export default function Cgpa() {
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [semesterCredits, setSemesterCredits] = useState<SemesterCreditsRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCreditsLoading(true);
      setCreditsError(null);

      try {
        const res = await fetch("/api/semester-credits", {
          headers: { Accept: "application/json" }
        });

        if (!res.ok) throw new Error(`API failed: ${res.status}`);
        const data = (await res.json()) as SemesterCreditsApiResponse;

        if (cancelled) return;
        setSemesterCredits(data.semesters || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setCreditsError("Unable to load semester credit reference.");
      } finally {
        if (!cancelled) setCreditsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <QuickCgpa
          semesterCredits={semesterCredits}
          creditsLoading={creditsLoading}
          creditsError={creditsError}
        />

        <SemesterCreditsReference
          rows={semesterCredits}
          loading={creditsLoading}
          error={creditsError}
        />

        <DetailedCgpa />
      </div>

      <Disclaimer />
    </div>
  );
}