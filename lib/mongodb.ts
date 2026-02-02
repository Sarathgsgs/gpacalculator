import { Db, MongoClient } from "mongodb";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

const uri = requireEnv("MONGODB_URI");
const dbName = process.env.MONGODB_DB || "academiacalc";

type GlobalMongoCache = {
  clientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as typeof globalThis & { __mongo?: GlobalMongoCache };
globalForMongo.__mongo ??= {};

async function getClient(): Promise<MongoClient> {
  const cache = globalForMongo.__mongo!;

  if (!cache.clientPromise) {
    const client = new MongoClient(uri);
    cache.clientPromise = client.connect();
  }

  return cache.clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}