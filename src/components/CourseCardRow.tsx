import React from "react";
import type { Course, Grade } from "../utils/types.js";
import GradePills from "./GradePills.js";

export default function CourseCardRow({
  course,
  grade,
  onGradeChange
}: {
  course: Course;
  grade: Grade | null;
  onGradeChange: (courseCode: string, grade: Grade) => void;
}) {
  const isNonCredit = !course.isCredit || course.credits <= 0;

  return (
    <div
      className={[
        "rounded-2xl border border-border/70 bg-surface/60 p-4",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]"
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-text">{course.courseTitle}</h3>
            <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-muted ring-1 ring-border">
              {course.courseCode}
            </span>
            {isNonCredit && (
              <span className="rounded-lg bg-accent2/10 px-2 py-1 text-[11px] font-semibold text-accent2 ring-1 ring-accent2/20">
                NON-CREDIT
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              Credits: <span className="text-text">{course.credits}</span>
            </span>
            <span>
              Type: <span className="text-text">{course.type}</span>
            </span>
            {isNonCredit && <span className="text-muted">Excluded from GPA</span>}
          </div>
        </div>

        <div className="md:shrink-0">
          {/* Non-credit still has grade (per your rule), so we DO NOT disable pills. */}
          <GradePills value={grade} onChange={(g: Grade) => onGradeChange(course.courseCode, g)} />
        </div>
      </div>
    </div>
  );
}