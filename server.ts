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
    try {
        await coursesHandler(req, res);
    } catch (e) {
        console.error("API Error:", e);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

app.get('/api/semester-credits', async (req: any, res: any) => {
    try {
        await creditsHandler(req, res);
    } catch (e) {
        console.error("API Error:", e);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
