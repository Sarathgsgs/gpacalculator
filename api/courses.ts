import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/mongodb";
import fs from "fs";
import path from "path";

const REGULATION = "2023";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("DEBUG: courses.ts handler starting", {
    semester: req.query.semester
  });

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
      if (!process.env.MONGODB_URI) {
        throw new Error("No MONGODB_URI");
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB Timeout")), 3000)
      );

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
      ]) as any[];

    } catch (dbErr: any) {
      console.warn("DB failed, using FS fallback:", dbErr.message);

      try {
        // Absolute path for local dev, relative for Vercel? 
        // Vercel serverless functions usually have the root at /var/task
        const jsonPath = path.join(process.cwd(), "seed", "courses.2023.json");
        const fileContent = fs.readFileSync(jsonPath, "utf8");
        const allCourses = JSON.parse(fileContent);

        courses = allCourses.filter((c: any) =>
          c.regulation === REGULATION && Number(c.semester) === semester
        );

        console.log(`DEBUG: Filtered ${courses.length} courses from FS`);
      } catch (fsErr) {
        console.error("FS fallback also failed:", fsErr);
        courses = [];
      }
    }

    // Sort as a final safety step
    courses.sort((a: any, b: any) => {
      if (a.isCredit !== b.isCredit) return (b.isCredit ? 1 : 0) - (a.isCredit ? 1 : 0);
      return (a.courseCode || "").localeCompare(b.courseCode || "");
    });

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      regulation: REGULATION,
      semester,
      courses: courses || []
    });
  } catch (err) {
    console.error("Critical API Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}