import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";
import { mapReiseDoc, type ReiseDoc } from "$lib/server/reisen";

export const GET: RequestHandler = async ({ url }) => {
  if (!MONGODB_URI) {
    return json({ ok: true, trips: [], skipped: "mongo disabled (MONGODB_URI missing)" });
  }

  const userId = url.searchParams.get("user_id")?.trim();
  if (!userId) {
    return json({ ok: false, error: "user_id ist erforderlich" }, { status: 400 });
  }

  const db = await getDb();
  const docs = await db.collection<ReiseDoc>("reisen").find({ user_id: userId }).sort({ start_date: 1 }).toArray();

  return json({ ok: true, trips: docs.map(mapReiseDoc) });
};

export const POST: RequestHandler = async ({ request }) => {
  if (!MONGODB_URI) {
    return json({ ok: false, error: "mongo disabled (MONGODB_URI missing)" }, { status: 503 });
  }

  const body = (await request.json()) as {
    trip?: Partial<ReiseDoc> & { id?: string };
    images?: string[];
  };

  const trip = body?.trip;
  const images = body?.images ?? trip?.images ?? [];

  if (!trip?.id || !trip.user_id || !trip.title) {
    return json({ ok: false, error: "trip.id, user_id und title sind erforderlich" }, { status: 400 });
  }

  const now = new Date();
  const doc: ReiseDoc = {
    _id: trip.id,
    user_id: trip.user_id,
    title: trip.title,
    location: trip.location ?? null,
    with_whom: trip.with_whom ?? null,
    cost: trip.cost ?? null,
    rating: trip.rating ?? null,
    description: trip.description ?? null,
    start_date: trip.start_date ?? null,
    end_date: trip.end_date ?? null,
    lat: trip.lat ?? null,
    lng: trip.lng ?? null,
    images,
    cover_image_url: trip.cover_image_url ?? images[0] ?? null,
    updated_at: now
  };

  const db = await getDb();
  await db
    .collection<ReiseDoc>("reisen")
    .updateOne(
      { _id: doc._id },
      {
        $set: doc,
        $setOnInsert: { created_at: now }
      },
      { upsert: true }
    );

  return json({ ok: true, trip: mapReiseDoc(doc) }, { status: 201 });
};
