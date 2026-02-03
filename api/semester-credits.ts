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

        let semesters = [];

        try {
            // Create a timeout promise to fail fast if DB is hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => {
                    console.error("DB Connection timed out after 10s");
                    reject(new Error("Database connection timed out"));
                }, 10000)
            );

            const dbRows = await Promise.race([
                (async () => {
                    const db = await getDb();
                    return db
                        .collection("courses")
                        .aggregate([
                            {
                                $match: {
                                    regulation: REGULATION,
                                    isCredit: true,
                                    credits: { $gt: 0 }
                                }
                            },
                            {
                                $group: {
                                    _id: "$semester",
                                    totalCredits: { $sum: "$credits" }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ])
                        .toArray();
                })(),
                timeoutPromise
            ]) as any[];

            semesters = dbRows.map((r: any) => ({
                semester: r._id as number,
                totalCredits: r.totalCredits as number
            }));

        } catch (dbErr) {
            console.warn("Database error in semester-credits (using fallback JSON):", dbErr);

            // Calculate from JSON
            const map = new Map<number, number>();
            const data = coursesData as any[];

            for (const c of data) {
                if (c.regulation === REGULATION && c.isCredit && c.credits > 0) {
                    const soFar = map.get(c.semester) || 0;
                    map.set(c.semester, soFar + c.credits);
                }
            }

            semesters = Array.from(map.entries())
                .map(([sem, credits]) => ({ semester: sem, totalCredits: credits }))
                .sort((a, b) => a.semester - b.semester);
        }

        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
        return res.status(200).json({ regulation: REGULATION, semesters });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}