import type { SupabaseClient } from "@supabase/supabase-js";
import { logSupabaseFetchError } from "@/lib/supabase/env";
import type { Database, InventoryAcquisition } from "@/types/database";

type Client = SupabaseClient<Database>;

export type AcquisitionWithRecovery = InventoryAcquisition & {
  recoveredCad: number;
  outstandingValueCad: number;
};

export async function getInventoryAcquisitions(
  supabase: Client,
): Promise<AcquisitionWithRecovery[]> {
  const { data: acquisitions, error } = await supabase
    .from("inventory_acquisitions")
    .select("*")
    .order("purchased_at", { ascending: false });

  if (error) {
    logSupabaseFetchError("getInventoryAcquisitions", error);
    return [];
  }

  const results: AcquisitionWithRecovery[] = [];

  for (const acquisition of acquisitions ?? []) {
    const { data: links } = await supabase
      .from("acquisition_cards")
      .select("card_id, quantity_added, cards(price_cad, status)")
      .eq("acquisition_id", acquisition.id);

    const cardIds = (links ?? []).map((row) => row.card_id);
    let recoveredCad = 0;

    if (cardIds.length > 0) {
      const { data: orderLines } = await supabase
        .from("order_items")
        .select("card_id, price_snapshot, quantity")
        .in("card_id", cardIds);

      for (const line of orderLines ?? []) {
        if (!line.card_id) continue;
        recoveredCad += Number(line.price_snapshot) * line.quantity;
      }

      const { data: privateSales } = await supabase
        .from("private_sales")
        .select("card_id, price_cad, quantity")
        .in("card_id", cardIds);

      for (const sale of privateSales ?? []) {
        if (!sale.card_id || sale.price_cad == null) continue;
        recoveredCad += Number(sale.price_cad) * sale.quantity;
      }
    }

    let outstandingValueCad = 0;
    for (const link of links ?? []) {
      const card = link.cards as { price_cad: number; status: string } | null;
      if (!card || card.status === "sold") continue;
      outstandingValueCad += Number(card.price_cad) * link.quantity_added;
    }

    results.push({
      ...acquisition,
      recoveredCad,
      outstandingValueCad,
    });
  }

  return results;
}

export async function getAcquisitionById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("inventory_acquisitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logSupabaseFetchError("getAcquisitionById", error);
    return null;
  }
  return data;
}
