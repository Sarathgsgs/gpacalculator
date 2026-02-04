import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/mongodb.js";
import { coursesData } from "../seed/courses.2023.data.js";

const REGULATION = "2023";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const meta = { timestamp: new Date().toISOString() };
    console.log("DEBUG: semester-credits.ts handler starting");

    try {
        if (req.method !== "GET") {
            res.setHeader("Allow", "GET");
            return res.status(405).json({ error: "Method not allowed" });
        }

        let semesters: any[] = [];
        let dbStatus = "skipped";

        try {
            if (process.env.MONGODB_URI) {
                dbStatus = "trying";
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Database Timeout (3s)")), 3000)
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

                if (dbRows) {
                    semesters = dbRows.map((r: any) => ({
                        semester: r._id as number,
                        totalCredits: r.totalCredits as number
                    }));
                    dbStatus = "success";
                }
            }
        } catch (dbErr: any) {
            console.warn("DEBUG: DB fallback triggered in credits:", dbErr.message);
            dbStatus = `failed: ${dbErr.message}`;
        }

        // Fallback
        if (semesters.length === 0) {
            console.log("DEBUG: Using static data fallback in credits");
            const allCourses = Array.isArray(coursesData) ? coursesData : [];
            const map = new Map<number, number>();
            for (const c of allCourses) {
                if (String(c?.regulation) === REGULATION && c?.isCredit && (c?.credits || 0) > 0) {
                    const s = Number(c.semester);
                    map.set(s, (map.get(s) || 0) + (c.credits || 0));
                }
            }

            semesters = Array.from(map.entries())
                .map(([sem, credits]) => ({ semester: sem, totalCredits: credits }))
                .sort((a, b) => a.semester - b.semester);
        }

        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
        return res.status(200).json({
            regulation: REGULATION,
            semesters,
            _debug: { dbStatus, meta }
        });

    } catch (err: any) {
        console.error("DEBUG: Critical API Error (credits):", err);
        return res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
            meta
        });
    }
}