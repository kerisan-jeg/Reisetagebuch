import type { WithId, Document } from "mongodb";

export type ReiseDoc = {
  _id: string;
  user_id: string;
  title: string;
  location?: string | null;
  with_whom?: string | null;
  cost?: number | null;
  rating?: number | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  lat?: number | null;
  lng?: number | null;
  images?: string[];
  cover_image_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
};

export function mapReiseDoc(doc: ReiseDoc | WithId<Document>) {
  const id = (doc as ReiseDoc)._id ?? doc._id;

  return {
    id: typeof id === "string" ? id : String(id),
    user_id: (doc as ReiseDoc).user_id,
    title: (doc as ReiseDoc).title,
    location: (doc as ReiseDoc).location ?? null,
    with_whom: (doc as ReiseDoc).with_whom ?? null,
    cost: (doc as ReiseDoc).cost ?? null,
    rating: (doc as ReiseDoc).rating ?? null,
    description: (doc as ReiseDoc).description ?? null,
    start_date: (doc as ReiseDoc).start_date ?? null,
    end_date: (doc as ReiseDoc).end_date ?? null,
    lat: (doc as ReiseDoc).lat ?? null,
    lng: (doc as ReiseDoc).lng ?? null,
    images: (doc as ReiseDoc).images ?? [],
    cover_image_url: (doc as ReiseDoc).cover_image_url ?? (doc as ReiseDoc).images?.[0] ?? null
  };
}
