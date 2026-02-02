import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/mongodb";

const REGULATION = "2023";

// Fallback data
// @ts-ignore
import coursesData from "../seed/courses.2023.json";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const semesterRaw = req.query.semester;
    const semester = Number(Array.isArray(semesterRaw) ? semesterRaw[0] : semesterRaw);

    if (!Number.isFinite(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ error: "Invalid semester. Expected 1–8." });
    }

    let courses = [];
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timed out")), 2000)
      );

      // Race database operation against timeout
      courses = await Promise.race([
        (async () => {
          const db = await getDb();
          return db
            .collection("courses")
            .find({ regulation: REGULATION, semester })
            .project({ _id: 0 })
            .sort({ isCredit: -1, courseCode: 1 })
            .toArray();
        })(),
        timeoutPromise
      ]) as any[]; // Cast to match expected type

    } catch (dbErr) {
      console.warn("Database connection specific error:", dbErr);
      console.warn("Using fallback JSON data.");

      // Fallback logic
      courses = coursesData.filter((c: any) => c.regulation === REGULATION && c.semester === semester);

      // Sort to match DB query: isCredit: -1 (desc), courseCode: 1 (asc)
      courses.sort((a: any, b: any) => {
        if (a.isCredit !== b.isCredit) {
          return (b.isCredit ? 1 : 0) - (a.isCredit ? 1 : 0);
        }
        return a.courseCode.localeCompare(b.courseCode);
      });
    }

    // Cache to reduce load on result day
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    return res.status(200).json({
      regulation: REGULATION,
      semester,
      courses
    });
  } catch (err) {
    console.error("Critical error in courses handler:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}