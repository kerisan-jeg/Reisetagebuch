import type { WithId, Document } from "mongodb";

export type BucketDoc = {
  _id: string;
  user_id: string;
  title: string;
  location?: string | null;
  year?: string | null;
  lat?: number | null;
  lng?: number | null;
  images?: string[];
  cover_image_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
};

export function mapBucketDoc(doc: BucketDoc | WithId<Document>) {
  const id = (doc as BucketDoc)._id ?? doc._id;

  return {
    id: typeof id === "string" ? id : String(id),
    user_id: (doc as BucketDoc).user_id,
    title: (doc as BucketDoc).title,
    location: (doc as BucketDoc).location ?? null,
    year: (doc as BucketDoc).year ?? null,
    lat: (doc as BucketDoc).lat ?? null,
    lng: (doc as BucketDoc).lng ?? null,
    images: (doc as BucketDoc).images ?? [],
    cover_image_url: (doc as BucketDoc).cover_image_url ?? (doc as BucketDoc).images?.[0] ?? null
  };
}
