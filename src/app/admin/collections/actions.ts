"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicCatalogSeo } from "@/lib/seo-revalidate";
import { redirect } from "next/navigation";
import { assertManager } from "@/lib/admin-auth";
import { roundPriceCad } from "@/lib/currency";
import { getCollectionById } from "@/lib/queries/collections";
import { createClient } from "@/lib/supabase/server";
import type { CollectionStatus } from "@/types/database";
import { slugify } from "@/lib/utils";

const COLLECTION_STATUSES: CollectionStatus[] = ["draft", "available", "sold"];

function parseCardIds(formData: FormData): string[] {
  const raw = formData.getAll("card_ids");
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of raw) {
    const id = String(value);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

async function replaceCollectionCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collectionId: string,
  cardIds: string[],
) {
  await supabase.from("collection_cards").delete().eq("collection_id", collectionId);
  if (cardIds.length === 0) return;

  await supabase.from("collection_cards").insert(
    cardIds.map((cardId, index) => ({
      collection_id: collectionId,
      card_id: cardId,
      sort_order: index,
    })),
  );
}

async function reserveCardsForCollection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cardIds: string[],
) {
  if (cardIds.length === 0) return;
  await supabase.from("cards").update({ status: "reserved" }).in("id", cardIds);
}

async function releaseCollectionCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collectionId: string,
) {
  const { data: links } = await supabase
    .from("collection_cards")
    .select("card_id")
    .eq("collection_id", collectionId);

  const cardIds = (links ?? []).map((row) => row.card_id);
  if (cardIds.length === 0) return;

  await supabase.from("cards").update({ status: "available" }).in("id", cardIds);
}

export async function createCollection(formData: FormData) {
  const supabase = await createClient();
  await assertManager(supabase);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/collections/new?error=missing_title");

  const slug = slugify(title);
  const { data, error } = await supabase
    .from("collections")
    .insert({
      title,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      price_cad: roundPriceCad(Number(formData.get("price_cad") ?? 0)),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/admin/collections/new?error=create_failed");
  }

  await replaceCollectionCards(supabase, data.id, parseCardIds(formData));

  revalidatePath("/admin/collections");
  redirect(`/admin/collections/${data.id}/edit`);
}

export async function saveCollection(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const existing = await getCollectionById(supabase, collectionId);
  if (!existing) redirect("/admin/collections");

  const title = String(formData.get("title") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "draft");
  const status: CollectionStatus = COLLECTION_STATUSES.includes(nextStatus as CollectionStatus)
    ? (nextStatus as CollectionStatus)
    : "draft";
  const cardIds = parseCardIds(formData);

  if (existing.status !== "draft") {
    redirect(`/admin/collections/${collectionId}/edit?error=published_locked`);
  }

  await supabase
    .from("collections")
    .update({
      title,
      slug: slugify(title),
      description: String(formData.get("description") ?? "").trim() || null,
      price_cad: roundPriceCad(Number(formData.get("price_cad") ?? 0)),
      status,
    })
    .eq("id", collectionId);

  await replaceCollectionCards(supabase, collectionId, cardIds);

  if (status === "available") {
    if (cardIds.length === 0) {
      redirect(`/admin/collections/${collectionId}/edit?error=no_cards`);
    }
    const { data: cards } = await supabase.from("cards").select("id, status").in("id", cardIds);
    const invalid = (cards ?? []).some((c) => c.status !== "available");
    if (invalid) {
      redirect(`/admin/collections/${collectionId}/edit?error=cards_unavailable`);
    }
    await reserveCardsForCollection(supabase, cardIds);
  }

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePublicCatalogSeo();
  redirect("/admin/collections");
}

export async function publishCollection(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const collection = await getCollectionById(supabase, collectionId);
  if (!collection) redirect("/admin/collections");

  const cardIds = collection.cards.map((row) => row.card_id);
  if (cardIds.length === 0) {
    redirect(`/admin/collections/${collectionId}/edit?error=no_cards`);
  }

  const unavailable = collection.cards.some((row) => row.card.status !== "available");
  if (unavailable) {
    redirect(`/admin/collections/${collectionId}/edit?error=cards_unavailable`);
  }

  await reserveCardsForCollection(supabase, cardIds);
  await supabase.from("collections").update({ status: "available" }).eq("id", collectionId);

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePublicCatalogSeo();
  redirect("/admin/collections");
}

export async function unpublishCollection(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  await releaseCollectionCards(supabase, collectionId);
  await supabase.from("collections").update({ status: "draft" }).eq("id", collectionId);

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePublicCatalogSeo();
  redirect(`/admin/collections/${collectionId}/edit`);
}

export async function deleteCollection(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const collection = await getCollectionById(supabase, collectionId);
  if (collection?.status === "available") {
    await releaseCollectionCards(supabase, collectionId);
  }

  await supabase.from("collections").delete().eq("id", collectionId);

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePublicCatalogSeo();
  redirect("/admin/collections");
}
