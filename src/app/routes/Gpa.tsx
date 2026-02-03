import React, { useEffect, useMemo, useState } from "react";
import SemesterSelect from "../../components/SemesterSelect";
import CourseCardRow from "../../components/CourseCardRow";
import Disclaimer from "../../components/Disclaimer";
import GpaResultModal from "../../components/GpaResultModal";
import type { Course, CoursesApiResponse, GradeMap } from "../../utils/types";
import { computeGpa, createEmptyGradeMap, round2 } from "../../utils/grading";

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/60 px-4 py-3">
      <div className="text-[11px] font-semibold tracking-widest text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text">{value}</div>
    </div>
  );
}

function getDisplayRank(c: Course): number {
  const type = (c.type || "").toLowerCase().trim();
  const isNonCredit = !c.isCredit || c.credits <= 0;
  if (isNonCredit) return 100; // always last

  const isLab = type.includes("lab");
  if (isLab) return 90; // labs near bottom (but before non-credit)

  // Main subject order (top to bottom)
  if (type.includes("theory")) return 0;
  if (type.includes("core")) return 1;
  if (type.includes("internship")) return 2;
  if (type.includes("skill")) return 3;
  if (type.includes("value added")) return 4;

  return 5; // other credit types
}

export default function Gpa() {
  const [semester, setSemester] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<GradeMap>({});
  const [computed, setComputed] = useState<number | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalGpa, setModalGpa] = useState<number>(0);

  const creditCourses = useMemo(
    () => courses.filter((c) => c.isCredit && c.credits > 0),
    [courses]
  );

  const gradedCreditCount = useMemo(() => {
    return creditCourses.filter((c) => grades[c.courseCode]).length;
  }, [creditCourses, grades]);

  const totalCreditCount = creditCourses.length;

  // Require ALL CREDIT courses graded before enabling calculate
  const canCalculate = totalCreditCount > 0 && gradedCreditCount === totalCreditCount;

  // Sorted list for display
  const displayCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const ra = getDisplayRank(a);
      const rb = getDisplayRank(b);
      if (ra !== rb) return ra - rb;
      return a.courseCode.localeCompare(b.courseCode);
    });
  }, [courses]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setComputed(null);
      setModalOpen(false);

      try {
        const res = await fetch(`/api/courses?semester=${semester}`, {
          headers: { Accept: "application/json" }
        });

        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = (await res.json()) as CoursesApiResponse;

        if (cancelled) return;

        setCourses(data.courses);
        setGrades(createEmptyGradeMap(data.courses));
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setCourses([]);
          setGrades({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [semester]);

  const onGradeChange = (courseCode: string, grade: any) => {
    setGrades((prev) => ({ ...prev, [courseCode]: grade }));
    setComputed(null);
    setModalOpen(false);
  };

  const onReset = () => {
    setGrades(createEmptyGradeMap(courses));
    setComputed(null);
    setModalOpen(false);
  };

  const onCalculate = () => {
    const result = computeGpa(courses, grades);
    if (!result) {
      setComputed(null);
      return;
    }

    const gpaRounded = round2(result.gpa);
    setComputed(gpaRounded);

    setModalGpa(result.gpa);
    setModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text md:text-4xl">
            Semester GPA Calculator
          </h1>
          <p className="mt-2 text-sm text-muted">
            Select your semester and choose grades using the pill buttons.
          </p>
        </div>

        <SemesterSelect value={semester} onChange={setSemester} disabled={loading} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatPill
          label="SUBJECTS GRADED (CREDIT)"
          value={`${gradedCreditCount} / ${totalCreditCount}`}
        />
        <StatPill
          label="CALCULATED GPA"
          value={
            computed === null ? (
              <span className="text-muted">-- / 10.00</span>
            ) : (
              <span className="text-accent">{computed.toFixed(2)} / 10.00</span>
            )
          }
        />
        <StatPill
          label="NOTE"
          value={
            <span className="text-muted">
              Non-credit grades are recorded but excluded from GPA.
            </span>
          }
        />
      </div>

      {/* Course List */}
      <div className="mt-6 grid gap-3">
        {loading && (
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-6 text-sm text-muted">
            Loading semester {semester} courses…
          </div>
        )}

        {!loading && courses.length === 0 && (
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-6 text-sm text-muted">
            No courses found for semester {semester}.
          </div>
        )}

        {!loading &&
          displayCourses.map((c) => (
            <CourseCardRow
              key={`${c.semester}-${c.courseCode}`}
              course={c}
              grade={grades[c.courseCode] ?? null}
              onGradeChange={onGradeChange}
            />
          ))}
      </div>

      {/* Actions moved to LAST */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl bg-white/5 px-5 py-3 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
        >
          Reset
        </button>

        <button
          type="button"
          disabled={!canCalculate}
          onClick={onCalculate}
          className={[
            "rounded-2xl px-5 py-3 text-sm font-semibold shadow-glow",
            canCalculate
              ? "bg-accent text-bg hover:brightness-110"
              : "cursor-not-allowed bg-white/10 text-muted"
          ].join(" ")}
          title={!canCalculate ? "Select grades for all credit courses to calculate GPA." : ""}
        >
          Calculate GPA
        </button>
      </div>

      <Disclaimer />

      <GpaResultModal
        open={modalOpen}
        gpa={modalGpa}
        onClose={() => setModalOpen(false)}
        onRecalculate={() => setModalOpen(false)}
      />
    </div>
  );
}