import 'dotenv/config';
import express from 'express';
// @ts-ignore
import coursesHandler from './api/courses';
// @ts-ignore
import creditsHandler from './api/semester-credits';

// dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Adapt Vercel handler to Express
app.get('/api/courses', async (req: any, res: any) => {
    console.log(`GET /api/courses?${new URLSearchParams(req.query).toString()}`);
    try {
        await coursesHandler(req, res);
    } catch (e) {
        console.error("API Error (/api/courses):", e);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

app.get('/api/semester-credits', async (req: any, res: any) => {
    console.log(`GET /api/semester-credits`);
    try {
        await creditsHandler(req, res);
    } catch (e) {
        console.error("API Error (/api/semester-credits):", e);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

// OCR Training Endpoint
import fs from 'fs';
import path from 'path';

app.post('/api/train-ocr', async (req: any, res: any) => {
    console.log("POST /api/train-ocr", req.body);
    try {
        let updates: Array<{ original: string, correction: string }> = [];

        // Support both single object and batch array
        if (Array.isArray(req.body)) {
            updates = req.body;
        } else if (req.body.batch && Array.isArray(req.body.batch)) {
            updates = req.body.batch;
        } else {
            const { original, correction } = req.body;
            if (original && correction) {
                updates.push({ original, correction });
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: "No valid corrections provided" });
        }

        // Determine file path based on type (default to course for backward compat)
        // We assume the batch is homogeneous or we handle mixed?
        // Let's assume homogeneous for now or check per item?
        // Simpler: The UI sends a batch of one type.

        // But wait, the previous code didn't have type.
        // Let's check the first item's type or a top-level type?
        // Let's look for `type` property in the first item or the body.

        // Actually, let's just loop and write to respective files.
        const courseUpdates: Record<string, string> = {};
        const gradeUpdates: Record<string, string> = {};

        for (const update of updates) {
            const u = update as any;
            if (u.original && u.correction) {
                if (u.type === 'grade') {
                    gradeUpdates[u.original] = u.correction;
                } else {
                    courseUpdates[u.original] = u.correction;
                }
            }
        }

        if (Object.keys(courseUpdates).length > 0) {
            const p = path.join(process.cwd(), 'src', 'data', 'ocr-corrections.json');
            let d = {};
            if (fs.existsSync(p)) d = JSON.parse(fs.readFileSync(p, 'utf-8'));
            Object.assign(d, courseUpdates);
            fs.writeFileSync(p, JSON.stringify(d, null, 2));
        }

        if (Object.keys(gradeUpdates).length > 0) {
            const p = path.join(process.cwd(), 'src', 'data', 'grade-corrections.json');
            let d = {};
            if (fs.existsSync(p)) d = JSON.parse(fs.readFileSync(p, 'utf-8'));
            Object.assign(d, gradeUpdates);
            fs.writeFileSync(p, JSON.stringify(d, null, 2));
        }

        console.log(`Learned ${updates.length} new rules.`);
        res.json({ success: true, count: updates.length });

    } catch (e) {
        console.error("Training Error:", e);
        res.status(500).json({ error: "Failed to save correction" });
    }
});


app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
