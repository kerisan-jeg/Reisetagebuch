import { MongoClient, type Db } from "mongodb";
import { MONGODB_URI, MONGODB_DB_NAME } from "$env/static/private";

let client: MongoClient | null = MONGODB_URI ? new MongoClient(MONGODB_URI) : null;
let dbPromise: Promise<Db> | null = null;

/**
 * Liefert eine wiederverwendete MongoDB-Verbindung.
 * DB-Name kommt aus MONGODB_DB_NAME, faellt sonst auf "reisetagebuch" zurueck.
 */
export async function getDb(): Promise<Db> {
  if (!MONGODB_URI || !client) {
    throw new Error("MONGODB_URI is not set in environment.");
  }

  if (!dbPromise) {
    const dbName = MONGODB_DB_NAME || "reisetagebuch";
    dbPromise = client.connect().then((c) => c.db(dbName));
  }

  return dbPromise;
}
