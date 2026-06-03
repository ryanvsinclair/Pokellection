import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCollectionPreviewImages,
  type CollectionPreviewImage,
} from "@/lib/collection-photos";
import { logSupabaseFetchError } from "@/lib/supabase/env";
import type { Card, Collection, CollectionCard, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type CollectionWithCards = Collection & {
  cards: (CollectionCard & { card: Card })[];
};

function sortCollectionCards<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

export type CollectionListingMeta = {
  cardCounts: Record<string, number>;
  previewImages: Record<string, CollectionPreviewImage[]>;
};

/** Card counts and up to four preview images per collection (batch). */
export async function getCollectionListingMeta(
  supabase: Client,
  collectionIds: string[],
): Promise<CollectionListingMeta> {
  const cardCounts: Record<string, number> = {};
  const previewImages: Record<string, CollectionPreviewImage[]> = {};

  for (const id of collectionIds) {
    cardCounts[id] = 0;
    previewImages[id] = [];
  }

  if (collectionIds.length === 0) {
    return { cardCounts, previewImages };
  }

  const { data: links, error } = await supabase
    .from("collection_cards")
    .select("collection_id, sort_order, cards(*)")
    .in("collection_id", collectionIds)
    .order("sort_order", { ascending: true });

  if (error) {
    logSupabaseFetchError("getCollectionListingMeta", error);
    return { cardCounts, previewImages };
  }

  const cardsByCollection = new Map<string, { sort_order: number; card: Card }[]>();
  for (const row of links ?? []) {
    const card = row.cards as Card;
    const list = cardsByCollection.get(row.collection_id) ?? [];
    list.push({ sort_order: row.sort_order, card });
    cardsByCollection.set(row.collection_id, list);
  }

  for (const id of collectionIds) {
    const cards = sortCollectionCards(cardsByCollection.get(id) ?? []).map((row) => row.card);

    cardCounts[id] = cards.length;
    previewImages[id] = buildCollectionPreviewImages(cards);
  }

  return { cardCounts, previewImages };
}

/** All published collections, newest first. */
export async function getAvailableCollections(supabase: Client): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseFetchError("getAvailableCollections", error);
    return [];
  }
  return data ?? [];
}

/** Published collection by slug with ordered member cards. */
export async function getAvailableCollectionBySlug(
  supabase: Client,
  slug: string,
): Promise<CollectionWithCards | null> {
  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("status", "available")
    .maybeSingle();

  if (!collection) return null;

  const { data: links, error } = await supabase
    .from("collection_cards")
    .select("collection_id, card_id, sort_order, cards(*)")
    .eq("collection_id", collection.id);

  if (error) {
    logSupabaseFetchError("getAvailableCollectionBySlug", error);
    return null;
  }

  const cards = sortCollectionCards(
    (links ?? []).map((row) => ({
      collection_id: row.collection_id,
      card_id: row.card_id,
      sort_order: row.sort_order,
      card: row.cards as Card,
    })),
  );

  return { ...collection, cards };
}

/** Manager: all collections. */
export async function getAllCollections(supabase: Client): Promise<Collection[]> {
  const { data } = await supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Manager: one collection with cards regardless of status. */
export async function getCollectionById(
  supabase: Client,
  id: string,
): Promise<CollectionWithCards | null> {
  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!collection) return null;

  const { data: links } = await supabase
    .from("collection_cards")
    .select("collection_id, card_id, sort_order, cards(*)")
    .eq("collection_id", id);

  const cards = sortCollectionCards(
    (links ?? []).map((row) => ({
      collection_id: row.collection_id,
      card_id: row.card_id,
      sort_order: row.sort_order,
      card: row.cards as Card,
    })),
  );

  return { ...collection, cards };
}

/** Slug of a published collection containing this card, if any. */
export async function getPublishedCollectionSlugForCard(
  supabase: Client,
  cardId: string,
): Promise<string | null> {
  const { data: links } = await supabase
    .from("collection_cards")
    .select("collection_id")
    .eq("card_id", cardId);

  const collectionIds = (links ?? []).map((row) => row.collection_id);
  if (collectionIds.length === 0) return null;

  const { data: collection } = await supabase
    .from("collections")
    .select("slug")
    .in("id", collectionIds)
    .eq("status", "available")
    .limit(1)
    .maybeSingle();

  return collection?.slug ?? null;
}

/** Card ids in published (available) collections — hidden from singles shop/search. */
export async function getCardIdsInPublishedCollections(supabase: Client): Promise<Set<string>> {
  const { data: collections } = await supabase
    .from("collections")
    .select("id")
    .eq("status", "available");

  const collectionIds = (collections ?? []).map((c) => c.id);
  if (collectionIds.length === 0) return new Set();

  const { data: links } = await supabase
    .from("collection_cards")
    .select("card_id")
    .in("collection_id", collectionIds);

  return new Set((links ?? []).map((row) => row.card_id));
}

/** Card ids currently tied to a non-draft collection (reserved in a bundle). */
export async function getCardIdsInActiveCollections(
  supabase: Client,
): Promise<Set<string>> {
  const { data: collections } = await supabase
    .from("collections")
    .select("id")
    .neq("status", "draft");

  const collectionIds = (collections ?? []).map((c) => c.id);
  if (collectionIds.length === 0) return new Set();

  const { data: links } = await supabase
    .from("collection_cards")
    .select("card_id")
    .in("collection_id", collectionIds);

  return new Set((links ?? []).map((row) => row.card_id));
}
