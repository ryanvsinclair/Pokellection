"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicCatalogSeo } from "@/lib/seo-revalidate";
import { assertManager } from "@/lib/admin-auth";
import { markCardSoldUpdate } from "@/lib/card-sold";
import { parseCollectrIdentityFromTag } from "@/lib/collectr";
import { roundPriceCad } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

function parseCollectrIdentityFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr:"));
  return tagged ? parseCollectrIdentityFromTag(tagged) : null;
}

export async function recordPrivateSale(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const { data: card } = await supabase
    .from("cards")
    .select("id, title, price_cad, quantity, tags, status")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) return;

  const priceRaw = String(formData.get("price_cad") ?? "");
  const priceCad = priceRaw ? roundPriceCad(Number(priceRaw)) : Number(card.price_cad);
  const quantity = Math.min(
    Math.max(1, Number(formData.get("quantity") ?? 1) || 1),
    card.quantity,
  );
  const buyerName = String(formData.get("buyer_name") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const collectrTag = parseCollectrIdentityFromTags(card.tags);

  await supabase.from("private_sales").insert({
    card_id: card.id,
    title_snapshot: card.title,
    price_cad: priceCad,
    quantity,
    buyer_name: buyerName,
    note,
    collectr_identity: collectrTag,
  });

  await supabase.from("cards").update(markCardSoldUpdate()).eq("id", card.id);

  revalidatePath("/admin/sales");
  revalidatePath("/admin/cards");
  revalidatePath("/shop");
  revalidatePublicCatalogSeo();
}
