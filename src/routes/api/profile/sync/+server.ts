import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";

type IncomingProfile = {
  id: string;
  email: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  metadata?: Record<string, unknown>;
};

export const POST: RequestHandler = async ({ request }) => {
  if (!MONGODB_URI) {
    return json({ ok: true, skipped: "mongo disabled (MONGODB_URI missing)" });
  }

  try {
    const body = (await request.json()) as Partial<IncomingProfile>;
    if (!body?.id) {
      return json({ ok: false, error: "Missing user id" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    await db.collection("users").updateOne(
      { user_id: body.id },
      {
        $set: {
          user_id: body.id,
          email: body.email ?? null,
          full_name: body.full_name ?? null,
          first_name: body.first_name ?? null,
          last_name: body.last_name ?? null,
          metadata: body.metadata ?? {},
          updated_at: now
        },
        $setOnInsert: {
          created_at: now
        }
      },
      { upsert: true }
    );

    return json({ ok: true });
  } catch (error: any) {
    console.error("Mongo profile sync error:", error);
    return json({ ok: false, error: error?.message ?? "Unknown error" }, { status: 500 });
  }
};
