import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Total units in the buyer cart (sum of line quantities). */
export async function getCartItemCount(
  supabase: Client,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("user_id", userId);

  return (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
}

/** Per-card quantities in the buyer cart (card_id → units). */
export async function getCartQuantitiesByCardId(
  supabase: Client,
  userId: string,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("cart_items")
    .select("card_id, quantity")
    .eq("user_id", userId);

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.card_id) map[row.card_id] = row.quantity;
  }
  return map;
}
