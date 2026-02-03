import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("No URI");

console.log("Attempting to connect to:", uri.replace(/:([^:@]+)@/, ":****@"));

const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
});

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully!");
        const admin = client.db().admin();
        const info = await admin.serverStatus();
        console.log("Server version:", info.version);
    } catch (e: any) {
        console.error("Connection failed:");
        console.error("Name:", e.name);
        console.error("Message:", e.message);
        if (e.cause) console.error("Cause:", e.cause);
    } finally {
        await client.close();
    }
}

main();
