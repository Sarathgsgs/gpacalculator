import type { Grade } from "./types";

import gradeCorrections from "../data/grade-corrections.json";
import ocrCorrections from "../data/ocr-corrections.json";

const VALID_GRADES: Grade[] = ["O", "A+", "A", "B+", "B", "C", "U"];

// ─── Text normalisation ──────────────────────────────────────────

/**
 * Normalise raw OCR text — fix common mis-reads and unify casing.
 */
function normalizeText(s: string): string {
  let text = (s || "").toUpperCase();

  // Apply GLOBAL course-code corrections
  for (const [bad, good] of Object.entries(ocrCorrections)) {
    text = text.split(bad.toUpperCase()).join(good as string);
  }

  // Heuristic: "A" followed by junk is often "A+"
  // We want to match "A" followed by any character that isn't a space, valid letter, or part of a status word.
  // Actually simpler: "A" followed by symbols like *, +, t, 1, etc.
  // The user said: "if anything is after A in grade section it is considered as A+"
  // We can try to replace `A` followed by non-whitespace/non-status char with `A+`.

  // Replace "A" followed by a non-space, non-P (first letter of PASS), non-F, non-A (ABSENT) char with A+
  // But wait, "AB" is Absent. "A " is A. "A+" is A+.

  // Safe regex: A followed by +, *, t, 1, 4, 7...
  // Let's rely on the explicit replacement below but make it broader.

  return text
    // fix A+ variants (symbols, numbers, or specific typos like 'At')
    .replace(/A\s*[\+＋\*1tT]/g, "A+")
    // fix B+ variants
    .replace(/B\s*[\+＋\*1tT]/g, "B+")
    // zero → letter O (grade)
    .replace(/\b0\b/g, "O")
    // remove stray pipe/bracket chars OCR sometimes adds
    .replace(/[|[\]{}]/g, " ");
}

// ─── Build fuzzy course-code regex ───────────────────────────────

function charPattern(ch: string): string {
  const c = ch.toUpperCase();
  const map: Record<string, string> = {
    "0": "[0OQD]", "1": "[1IL|!]", "2": "[2Zz]", "3": "[3E58]",
    "4": "[4A1]", // 4 often read as 1 or A
    "5": "[5S]", "6": "[6Gb]", "7": "[7T]",
    "8": "[8B]", "9": "[9gq]",
    "A": "[A4]", "B": "[B8]", "C": "[C(]", "D": "[D0O]",
    "E": "[E3]", "G": "[G6]", "I": "[I1L|]", "L": "[L1I|]",
    "O": "[O0QD]", "P": "[P]", "Q": "[Q0O]",
    "S": "[S5$]", "T": "[T7]", "U": "[UHV]", "X": "[Xx*]",
    "Z": "[Z2]",
  };
  return map[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a regex that matches a course code even when OCR inserts
 * extra spaces / punctuation or confuses similar characters.
 * e.g. "23CS4401" will match "23 CS 4401", "23C54401", etc.
 */
function looseCourseCodeRegex(courseCode: string): RegExp {
  const chars = courseCode.split("").map(charPattern);
  // allow whitespace / punctuation between characters (OCR noise)
  return new RegExp(chars.join("[^A-Z0-9]{0,4}"), "gi");
}

// ─── Grade extraction from a single line ─────────────────────────

/**
 * The grade tokens we look for, ordered so longer/more specific
 * patterns match first (A+ before A, B+ before B).
 */
const GRADE_PATTERNS: Array<[Grade, RegExp]> = [
  ["A+", /A\s*[\+＋]/i],
  ["B+", /B\s*[\+＋]/i],
  ["O", /\bO\b/i],
  ["A", /\bA\b/i],
  ["B", /\bB\b/i],
  ["C", /\bC\b/i],
  ["U", /\bU\b/i],
];

/**
 * Extract a grade from a single line of text.
 */
function gradeFromLine(line: string): Grade | null {
  const norm = normalizeText(line);

  // Apply GRADE-specific corrections (from grade-corrections.json)
  // These are applied AFTER normalization to catch specific tokens that normalizeText missed
  // or that were misread as something else.
  // We check if the line *contains* the bad-grade token? 
  // Or do we normalize the specific token?

  // Let's tokenize first, then check corrections on tokens.
  const tokens = norm.split(/\s+/).reverse();

  for (const tok of tokens) {
    // 0. Check explicitly against learned corrections
    // Note: corrections keys should be UPPERCASE to match norm
    if (gradeCorrections[tok as keyof typeof gradeCorrections]) {
      return gradeCorrections[tok as keyof typeof gradeCorrections] as Grade;
    }

    // skip status / irrelevant tokens
    if (/^(PASS|FAIL|ABSENT|RA|WH|SA|W)$/i.test(tok)) continue;

    // 1. Standard pattern matching
    for (const [grade, re] of GRADE_PATTERNS) {
      if (tok.length <= 4 && re.test(tok)) return grade;
    }
  }

  return null;
}

// ─── Main extraction ─────────────────────────────────────────────

/**
 * Extract grades from OCR text for a list of course codes.
 *
 * Multi-strategy approach:
 *   1. Line-by-line: find course code on a line → extract grade from same line
 *   2. Nearby-line fallback: if grade not on same line, check ±2 adjacent lines
 *   3. Right-side scan: for each line with a course code, scan the right half
 */
export function extractGradesForCourses(
  ocrText: string,
  courseCodes: string[]
): Record<string, Grade> {
  const out: Record<string, Grade> = {};
  const lines = ocrText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  for (const code of courseCodes) {
    const re = looseCourseCodeRegex(code);

    // --- Strategy 1: line-by-line ---
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) {
        re.lastIndex = 0; // reset for next test
        continue;
      }
      re.lastIndex = 0;

      // Try grade on the same line
      const grade = gradeFromLine(lines[i]);
      if (grade) {
        out[code] = grade;
        break;
      }

      // --- Strategy 2: nearby lines (±2) ---
      for (const offset of [1, -1, 2, -2]) {
        const ni = i + offset;
        if (ni < 0 || ni >= lines.length) continue;
        const g = gradeFromLine(lines[ni]);
        if (g) {
          out[code] = g;
          break;
        }
      }
      if (out[code]) break;
    }

    // --- Strategy 3: full-text window fallback (legacy) ---
    if (!out[code]) {
      const fullText = normalizeText(ocrText);
      re.lastIndex = 0;
      const match = re.exec(fullText);
      if (match && match.index != null) {
        // Narrow window: only 100 chars after the match (right side = grade column)
        const afterMatch = fullText.slice(match.index + match[0].length, match.index + match[0].length + 100);
        for (const [grade, gRe] of GRADE_PATTERNS) {
          if (gRe.test(afterMatch)) {
            out[code] = grade;
            break;
          }
        }
      }
    }
  }

  return out;
}

export function countMatches(map: Record<string, Grade>) {
  return Object.keys(map).length;
}  