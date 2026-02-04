import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/mongodb";
import { coursesData } from "../seed/courses.2023.data";

const REGULATION = "2023";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const meta = {
    semester: req.query.semester,
    timestamp: new Date().toISOString()
  };

  console.log("DEBUG: courses.ts handler starting", meta);

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

    let courses: any[] = [];
    let dbStatus = "skipped";

    try {
      if (process.env.MONGODB_URI) {
        dbStatus = "trying";
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database Timeout (3s)")), 3000)
        );

        const dbResult = await Promise.race([
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
        ]) as any[];

        if (dbResult) {
          courses = dbResult;
          dbStatus = "success";
        }
      }
    } catch (dbErr: any) {
      console.warn("DEBUG: DB fallback triggered:", dbErr.message);
      dbStatus = `failed: ${dbErr.message}`;
    }

    // Fallback if DB failed or was skipped
    if (courses.length === 0) {
      console.log("DEBUG: Using static data fallback");
      const rawData = Array.isArray(coursesData) ? coursesData : [];
      courses = rawData.filter((c: any) =>
        String(c?.regulation) === REGULATION && Number(c?.semester) === semester
      );
    }

    // Final sort
    courses.sort((a: any, b: any) => {
      if (a.isCredit !== b.isCredit) return (b.isCredit ? 1 : 0) - (a.isCredit ? 1 : 0);
      return (a.courseCode || "").localeCompare(b.courseCode || "");
    });

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      regulation: REGULATION,
      semester,
      courses,
      _debug: { dbStatus, meta }
    });

  } catch (err: any) {
    console.error("DEBUG: Critical API Error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
      stack: err.stack,
      meta
    });
  }
}