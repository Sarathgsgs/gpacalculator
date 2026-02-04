import type { Course, Grade, GradeMap, GpaResult, SemesterEntry } from "./types.js";

export const GRADES: Grade[] = ["O", "A+", "A", "B+", "B", "C", "U"];

export const GRADE_POINTS: Record<Grade, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  U: 0
};

// Use integer scaling to avoid float issues with credits like 1.5
// 1.5 * 2 = 3 (integer) => exact math
const CREDIT_SCALE = 2;

function toScaledCredits(credits: number): number {
  // robust rounding for safety
  return Math.round(credits * CREDIT_SCALE);
}

export function round2(n: number): number {
  // fixes cases like 8.749999999 -> 8.75
  return Number((n + Number.EPSILON).toFixed(2));
}

export function computeGpa(courses: Course[], grades: GradeMap): GpaResult | null {
  let totalCreditsScaled = 0;
  let totalPointsScaled = 0;
  let countedCourses = 0;

  for (const c of courses) {
    if (!c.isCredit || c.credits <= 0) continue;

    const g = grades[c.courseCode];
    if (!g) continue;

    const creditsScaled = toScaledCredits(c.credits);
    const gp = GRADE_POINTS[g];

    totalCreditsScaled += creditsScaled;
    totalPointsScaled += creditsScaled * gp;
    countedCourses += 1;
  }

  if (totalCreditsScaled <= 0 || countedCourses === 0) return null;

  return {
    gpa: totalPointsScaled / totalCreditsScaled,
    totalCredits: totalCreditsScaled / CREDIT_SCALE, // original scale for display/info
    countedCourses
  };
}

export function computeQuickCgpa(
  prevCgpa: number,
  prevCredits: number,
  currentGpa: number,
  currentCredits: number
): number | null {
  const a = Number(prevCgpa);
  const b = Number(prevCredits);
  const c = Number(currentGpa);
  const d = Number(currentCredits);

  if (![a, b, c, d].every(Number.isFinite)) return null;
  if (b < 0 || d < 0) return null;
  if (b + d === 0) return null;

  return (a * b + c * d) / (b + d);
}

export function computeDetailedCgpa(entries: SemesterEntry[]): number | null {
  let totalCredits = 0;
  let totalPoints = 0;

  for (const e of entries) {
    if (!Number.isFinite(e.gpa) || !Number.isFinite(e.credits)) return null;
    if (e.credits < 0) return null;

    totalCredits += e.credits;
    totalPoints += e.gpa * e.credits;
  }

  if (totalCredits === 0) return null;
  return totalPoints / totalCredits;
}

export function createEmptyGradeMap(courses: Course[]): GradeMap {
  const map: GradeMap = {};
  for (const c of courses) map[c.courseCode] = null;
  return map;
}