import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";
import { mapReiseDoc, type ReiseDoc } from "$lib/server/reisen";

export const GET: RequestHandler = async ({ params, url }) => {
  if (!MONGODB_URI) {
    return json({ ok: true, trip: null, skipped: "mongo disabled (MONGODB_URI missing)" });
  }

  const userId = url.searchParams.get("user_id")?.trim();
  if (!userId) {
    return json({ ok: false, error: "user_id ist erforderlich" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection<ReiseDoc>("reisen").findOne({ _id: params.id, user_id: userId });

  if (!doc) {
    return json({ ok: false, error: "Reise nicht gefunden" }, { status: 404 });
  }

  return json({ ok: true, trip: mapReiseDoc(doc) });
};
