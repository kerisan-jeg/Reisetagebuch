import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";
import { mapBucketDoc, type BucketDoc } from "$lib/server/bucketlist";

export const GET: RequestHandler = async ({ url }) => {
  if (!MONGODB_URI) {
    return json({ ok: true, bucketlist: [], skipped: "mongo disabled (MONGODB_URI missing)" });
  }

  const userId = url.searchParams.get("user_id")?.trim();
  if (!userId) {
    return json({ ok: false, error: "user_id ist erforderlich" }, { status: 400 });
  }

  const db = await getDb();
  const docs = await db.collection<BucketDoc>("bucketlist").find({ user_id: userId }).sort({ year: 1 }).toArray();

  return json({ ok: true, bucketlist: docs.map(mapBucketDoc) });
};

export const POST: RequestHandler = async ({ request }) => {
  if (!MONGODB_URI) {
    return json({ ok: false, error: "mongo disabled (MONGODB_URI missing)" }, { status: 503 });
  }

  const body = (await request.json()) as {
    item?: Partial<BucketDoc> & { id?: string };
    images?: string[];
  };

  const item = body?.item;
  const images = body?.images ?? item?.images ?? [];

  if (!item?.id || !item.user_id || !item.title) {
    return json({ ok: false, error: "item.id, user_id und title sind erforderlich" }, { status: 400 });
  }

  const now = new Date();
  const doc: BucketDoc = {
    _id: item.id,
    user_id: item.user_id,
    title: item.title,
    location: item.location ?? null,
    year: item.year ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    images,
    cover_image_url: item.cover_image_url ?? images[0] ?? null,
    updated_at: now
  };

  const db = await getDb();
  await db
    .collection<BucketDoc>("bucketlist")
    .updateOne(
      { _id: doc._id },
      { $set: doc, $setOnInsert: { created_at: now } },
      { upsert: true }
    );

  return json({ ok: true, item: mapBucketDoc(doc) }, { status: 201 });
};
