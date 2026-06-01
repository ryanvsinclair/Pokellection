"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertManager } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { CardCondition, CardStatus } from "@/types/database";

const CARD_STATUSES: CardStatus[] = ["available", "reserved", "sold", "draft"];
const CARD_CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

export async function setCardStatus(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!cardId || !CARD_STATUSES.includes(status as CardStatus)) return;

  const supabase = await createClient();
  await assertManager(supabase);

  await supabase.from("cards").update({ status: status as CardStatus }).eq("id", cardId);

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

  await supabase
    .from("cards")
    .update({
      title: String(formData.get("title") ?? ""),
      set_name: String(formData.get("set_name") ?? "") || null,
      card_number: String(formData.get("card_number") ?? "") || null,
      rarity: String(formData.get("rarity") ?? "") || null,
      condition,
      price_cad: Number(formData.get("price_cad") ?? 0),
      quantity: Number(formData.get("quantity") ?? 1),
      description: String(formData.get("description") ?? "") || null,
      status,
    })
    .eq("id", cardId);

  revalidatePath("/admin/cards");
  revalidatePath(`/shop`);
  redirect("/admin/cards");
}
