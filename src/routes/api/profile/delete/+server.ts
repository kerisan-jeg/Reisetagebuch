import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/server/mongo";
import { SUPABASE_URL } from "$lib/supabaseClient";

const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && serviceRoleKey
    ? createClient(SUPABASE_URL, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

const extractPath = (url: string, bucket: string): string | null => {
  try {
    const path = new URL(url).pathname;
    const match = path.match(new RegExp(`/${bucket}/(.+)$`));
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

export const POST: RequestHandler = async ({ request }) => {
  if (!SUPABASE_URL || !serviceRoleKey || !supabaseAdmin) {
    return json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL missing" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length)
    : null;

  if (!token) {
    return json({ ok: false, error: "Missing bearer token" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const userId = userData.user.id;
  const deletes = { trips: 0, bucket: 0, storage: 0, mongoTrips: 0, mongoBucket: 0, mongoUsers: 0 };

  // Collect file paths before deleting table rows
  const tripImages = new Set<string>();
  const bucketImages = new Set<string>();

  const { data: trips } = await supabaseAdmin
    .from("reisen")
    .select("images,cover_image_url")
    .eq("user_id", userId);
  const { data: buckets } = await supabaseAdmin
    .from("bucketlist")
    .select("images,cover_image_url")
    .eq("user_id", userId);

  (trips ?? []).forEach((t: any) => {
    (t.images ?? []).forEach((url: string) => {
      const path = extractPath(url, "uploads");
      if (path) tripImages.add(path);
    });
    if (t.cover_image_url) {
      const path = extractPath(t.cover_image_url, "uploads");
      if (path) tripImages.add(path);
    }
  });

  (buckets ?? []).forEach((b: any) => {
    (b.images ?? []).forEach((url: string) => {
      const path = extractPath(url, "bucketlist");
      if (path) bucketImages.add(path);
    });
    if (b.cover_image_url) {
      const path = extractPath(b.cover_image_url, "bucketlist");
      if (path) bucketImages.add(path);
    }
  });

  // Delete supabase rows
  const { error: tripDeleteError, count: tripCount } = await supabaseAdmin
    .from("reisen")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  if (tripDeleteError) console.error("Trip delete error:", tripDeleteError);
  deletes.trips = tripCount ?? 0;

  const { error: bucketDeleteError, count: bucketCount } = await supabaseAdmin
    .from("bucketlist")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  if (bucketDeleteError) console.error("Bucket delete error:", bucketDeleteError);
  deletes.bucket = bucketCount ?? 0;

  // Delete storage files (best effort)
  const storageRemovals: string[] = [];
  if (tripImages.size > 0) {
    const { data, error } = await supabaseAdmin.storage.from("uploads").remove(Array.from(tripImages));
    if (error) console.warn("Storage delete (uploads) error:", error);
    storageRemovals.push(...((data as any[])?.map((r) => r.path) ?? []));
  }
  if (bucketImages.size > 0) {
    const { data, error } = await supabaseAdmin.storage.from("bucketlist").remove(Array.from(bucketImages));
    if (error) console.warn("Storage delete (bucketlist) error:", error);
    storageRemovals.push(...((data as any[])?.map((r) => r.path) ?? []));
  }
  deletes.storage = storageRemovals.length;

  // Mongo cleanup (best effort)
  try {
    const db = await getDb();
    const tripsRes = await db.collection("reisen").deleteMany({ user_id: userId });
    const bucketRes = await db.collection("bucketlist").deleteMany({ user_id: userId });
    const usersRes = await db.collection("users").deleteMany({ user_id: userId });
    deletes.mongoTrips = tripsRes.deletedCount ?? 0;
    deletes.mongoBucket = bucketRes.deletedCount ?? 0;
    deletes.mongoUsers = usersRes.deletedCount ?? 0;
  } catch (mongoErr) {
    console.warn("Mongo cleanup failed:", mongoErr);
  }

  // Delete auth user last
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error("Auth delete error:", authDeleteError);
    return json({ ok: false, error: "Account deletion failed" }, { status: 500 });
  }

  return json({ ok: true, deleted: deletes });
};
