import { MongoClient } from "mongodb";
import courses from "./courses.2023.json" assert { type: "json" };

type CourseDoc = {
  regulation: string;
  semester: number;
  courseCode: string;
  courseTitle: string;
  credits: number;
  type: string;
  isCredit: boolean;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

const uri = requireEnv("MONGODB_URI");
const dbName = process.env.MONGODB_DB || "academiacalc";

function assertValidCourse(c: CourseDoc) {
  if (!c.regulation) throw new Error("Missing regulation");
  if (!Number.isFinite(c.semester)) throw new Error("Invalid semester");
  if (!c.courseCode) throw new Error("Missing courseCode");
  if (!c.courseTitle) throw new Error("Missing courseTitle");
  if (!Number.isFinite(c.credits)) throw new Error("Invalid credits");
  if (typeof c.isCredit !== "boolean") throw new Error("Invalid isCredit");
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);
  const col = db.collection<CourseDoc>("courses");

  await col.createIndex({ regulation: 1, semester: 1, courseCode: 1 }, { unique: true });
  await col.createIndex({ regulation: 1, semester: 1 });

  const ops = (courses as CourseDoc[]).map((c) => {
    assertValidCourse(c);
    return {
      updateOne: {
        filter: { regulation: c.regulation, semester: c.semester, courseCode: c.courseCode },
        update: { $set: c },
        upsert: true
      }
    };
  });

  if (ops.length) {
    const result = await col.bulkWrite(ops, { ordered: false });
    console.log("Seed complete:", {
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } else {
    console.log("No courses found in JSON.");
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});