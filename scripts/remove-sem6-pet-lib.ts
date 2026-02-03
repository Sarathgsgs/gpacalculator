import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { MongoClient } from "mongodb";

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI in .env");

    const dbName = process.env.MONGODB_DB || "academiacalc";

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);

    const r = await db.collection("courses").deleteMany({
        regulation: "2023",
        semester: 6,
        courseCode: { $in: ["PET", "LIB"] }
    });

    console.log("Deleted:", r.deletedCount);

    await client.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});