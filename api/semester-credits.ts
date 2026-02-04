import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/mongodb";
import fs from "fs";
import path from "path";

const REGULATION = "2023";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log("DEBUG: semester-credits.ts handler starting");
    try {
        if (req.method !== "GET") {
            res.setHeader("Allow", "GET");
            return res.status(405).json({ error: "Method not allowed" });
        }

        let semesters: any[] = [];

        try {
            if (!process.env.MONGODB_URI) {
                throw new Error("No MONGODB_URI");
            }

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("DB Timeout")), 3000)
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

        } catch (dbErr: any) {
            console.warn("DB failed in semester-credits, using FS fallback:", dbErr.message);

            try {
                const jsonPath = path.join(process.cwd(), "seed", "courses.2023.json");
                const fileContent = fs.readFileSync(jsonPath, "utf8");
                const allCourses = JSON.parse(fileContent);

                const map = new Map<number, number>();
                for (const c of allCourses) {
                    if (c.regulation === REGULATION && c.isCredit && c.credits > 0) {
                        const s = Number(c.semester);
                        map.set(s, (map.get(s) || 0) + c.credits);
                    }
                }

                semesters = Array.from(map.entries())
                    .map(([sem, credits]) => ({ semester: sem, totalCredits: credits }))
                    .sort((a, b) => a.semester - b.semester);

                console.log(`DEBUG: Found ${semesters.length} semesters from FS`);
            } catch (fsErr) {
                console.error("FS fallback failed for semester-credits:", fsErr);
                semesters = [];
            }
        }

        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
        return res.status(200).json({ regulation: REGULATION, semesters });
    } catch (err) {
        console.error("Critical API Error (credits):", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}