import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/mongodb";

const REGULATION = "2023";

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

    const db = await getDb();

    const courses = await db
      .collection("courses")
      .find({ regulation: REGULATION, semester })
      .project({ _id: 0 })
      .sort({ isCredit: -1, courseCode: 1 })
      .toArray();

    // Cache to reduce load on result day
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    return res.status(200).json({
      regulation: REGULATION,
      semester,
      courses
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}