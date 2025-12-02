import { MongoClient, type Db } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

let client: MongoClient | null = MONGODB_URI ? new MongoClient(MONGODB_URI) : null;
let dbPromise: Promise<Db> | null = null;

export async function getDb(): Promise<Db> {
  if (!MONGODB_URI || !client) {
    throw new Error("MONGODB_URI is not set in environment.");
  }

  if (!dbPromise) {
    dbPromise = client.connect().then((c) => c.db("reisetagebuch"));
  }

  return dbPromise;
}
