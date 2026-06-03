"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertManager } from "@/lib/admin-auth";
import { roundPriceCad } from "@/lib/currency";
import { soldAtForStatus } from "@/lib/card-sold";
import { createClient } from "@/lib/supabase/server";
import { isCardLanguage } from "@/lib/card-language";
import type { CardCondition, CardLanguage, CardStatus } from "@/types/database";

const CARD_STATUSES: CardStatus[] = ["available", "reserved", "sold", "draft"];
const CARD_CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

export async function setCardStatus(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!cardId || !CARD_STATUSES.includes(status as CardStatus)) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const nextStatus = status as CardStatus;
  await supabase
    .from("cards")
    .update({ status: nextStatus, sold_at: soldAtForStatus(nextStatus) })
    .eq("id", cardId);

  revalidatePath("/admin/cards");
  revalidatePath("/shop");
}

export async function deleteCard(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  await supabase.from("cards").delete().eq("id", cardId);

  revalidatePath("/admin/cards");
  revalidatePath("/shop");
}

export async function saveCardEdits(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const rawCondition = String(formData.get("condition") ?? "LP");
  const condition: CardCondition = CARD_CONDITIONS.includes(rawCondition as CardCondition)
    ? (rawCondition as CardCondition)
    : "LP";
  const rawStatus = String(formData.get("status") ?? "available");
  const status: CardStatus = CARD_STATUSES.includes(rawStatus as CardStatus)
    ? (rawStatus as CardStatus)
    : "available";
  const rawLanguage = String(formData.get("language") ?? "english");
  const language: CardLanguage = isCardLanguage(rawLanguage) ? rawLanguage : "english";

  await supabase
    .from("cards")
    .update({
      title: String(formData.get("title") ?? ""),
      set_name: String(formData.get("set_name") ?? "") || null,
      card_number: String(formData.get("card_number") ?? "") || null,
      rarity: String(formData.get("rarity") ?? "") || null,
      condition,
      price_cad: roundPriceCad(Number(formData.get("price_cad") ?? 0)),
      quantity: Number(formData.get("quantity") ?? 1),
      description: String(formData.get("description") ?? "") || null,
      status,
      language,
      sold_at: soldAtForStatus(status),
    })
    .eq("id", cardId);

  revalidatePath("/admin/cards");
  revalidatePath(`/shop`);
  redirect("/admin/cards");
}

export async function appendCardPhotoPaths(
  cardId: string,
  newPaths: string[],
): Promise<{ ok: true; photoCount: number } | { ok: false; error: string }> {
  if (!cardId || newPaths.length === 0) {
    return { ok: false, error: "No photos to add." };
  }

  try {
    const supabase = await createClient();
    await assertManager(supabase);

    const { data: card, error: fetchError } = await supabase
      .from("cards")
      .select("photo_paths, slug")
      .eq("id", cardId)
      .single();

    if (fetchError || !card) {
      return { ok: false, error: fetchError?.message ?? "Card not found." };
    }

    const photo_paths = [...(card.photo_paths ?? []), ...newPaths];

    const { error: updateError } = await supabase
      .from("cards")
      .update({ photo_paths })
      .eq("id", cardId);

    if (updateError) return { ok: false, error: updateError.message };

    revalidatePath("/admin/cards");
    revalidatePath("/shop");
    revalidatePath(`/shop/${card.slug}`);
    revalidatePath("/collections");

    return { ok: true, photoCount: photo_paths.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save photos.";
    return { ok: false, error: message };
  }
}
