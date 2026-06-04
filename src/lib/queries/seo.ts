import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/server";
import { logSupabaseFetchError } from "@/lib/supabase/env";
import type { Card } from "@/types/database";

export const SEO_CARDS_TAG = "seo-cards";
export const SEO_COLLECTIONS_TAG = "seo-collections";

export type SeoCardEntry = Pick<
  Card,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "set_name"
  | "condition"
  | "language"
  | "rarity"
  | "card_number"
  | "price_cad"
  | "quantity"
  | "status"
  | "photo_paths"
  | "updated_at"
>;

export type SeoSlugEntry = { slug: string; updated_at: string };

async function fetchAvailableCardCatalog(): Promise<SeoCardEntry[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("cards")
    .select(
      "id, slug, title, description, set_name, condition, language, rarity, card_number, price_cad, quantity, status, photo_paths, updated_at",
    )
    .eq("status", "available")
    .gt("quantity", 0)
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseFetchError("fetchAvailableCardCatalog", error);
    return [];
  }
  return data ?? [];
}

async function fetchAvailableCollectionSlugs(): Promise<SeoSlugEntry[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("collections")
    .select("slug, updated_at")
    .eq("status", "available")
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseFetchError("fetchAvailableCollectionSlugs", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    slug: row.slug,
    updated_at: row.updated_at,
  }));
}

export const getCachedAvailableCardsForSeo = unstable_cache(
  fetchAvailableCardCatalog,
  ["seo-available-cards"],
  { revalidate: 120, tags: [SEO_CARDS_TAG] },
);

export const getCachedCollectionSlugsForSeo = unstable_cache(
  fetchAvailableCollectionSlugs,
  ["seo-collection-slugs"],
  { revalidate: 120, tags: [SEO_COLLECTIONS_TAG] },
);
