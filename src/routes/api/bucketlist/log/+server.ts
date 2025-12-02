import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";

export const POST: RequestHandler = async ({ request }) => {
  // Wenn keine MONGODB_URI gesetzt ist, logging überspringen
  if (!MONGODB_URI) {
    return json({ ok: true, skipped: "mongo logging disabled (MONGODB_URI missing)" });
  }

  try {
    const payload = await request.json();
    const db = await getDb();
    await db.collection("bucketlist_logs").insertOne({
      ...payload,
      created_at: new Date()
    });
    return json({ ok: true });
  } catch (error: any) {
    console.error("Mongo log error:", error);
    return json({ ok: false, error: error?.message ?? "Unknown error" }, { status: 500 });
  }
};
