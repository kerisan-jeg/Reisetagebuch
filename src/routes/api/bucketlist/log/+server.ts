import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { MONGODB_URI } from "$env/static/private";

type LogPayload = {
  action: string;
  itemId?: string;
  userId?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  // Wenn keine MONGODB_URI gesetzt ist, Logging ueberspringen
  if (!MONGODB_URI) {
    return json({ ok: true, skipped: "mongo logging disabled (MONGODB_URI missing)" });
  }

  try {
    const body = (await request.json()) as Partial<LogPayload>;

    if (!body?.action) {
      return json({ ok: false, error: "Missing required field: action" }, { status: 400 });
    }

    const payload: LogPayload & {
      created_at: Date;
      ip?: string;
      user_agent?: string | null;
    } = {
      action: body.action,
      itemId: body.itemId,
      userId: body.userId,
      message: body.message,
      metadata: body.metadata,
      created_at: new Date(),
      ip: getClientAddress(),
      user_agent: request.headers.get("user-agent")
    };

    const db = await getDb();
    await db.collection("bucketlist_logs").insertOne(payload);

    return json({ ok: true });
  } catch (error: any) {
    console.error("Mongo log error:", error);
    return json({ ok: false, error: error?.message ?? "Unknown error" }, { status: 500 });
  }
};
