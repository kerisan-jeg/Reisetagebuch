import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";

// DELETE /api/bucketlist/:id?user_id=...
export const DELETE: RequestHandler = async ({ params, url }) => {
  if (!MONGODB_URI) {
    return json({ ok: false, error: "mongo disabled (MONGODB_URI missing)" }, { status: 503 });
  }

  const id = params.id;
  const userId = url.searchParams.get("user_id")?.trim();

  if (!id || !userId) {
    return json({ ok: false, error: "id und user_id sind erforderlich" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db.collection("bucketlist").deleteOne({ _id: id, user_id: userId });

  return json({ ok: true, deleted: res.deletedCount ?? 0 });
};
