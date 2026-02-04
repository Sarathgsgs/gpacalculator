import { Db, MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB || "academiacalc";

type GlobalMongoCache = {
  clientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as typeof globalThis & { __mongo?: GlobalMongoCache };
globalForMongo.__mongo ??= {};

async function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI env var is not defined");
  }

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
