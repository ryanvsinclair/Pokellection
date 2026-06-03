import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type SoldHistoryRow = {
  id: string;
  soldAt: string;
  title: string;
  priceCad: number | null;
  quantity: number;
  source: "site" | "private";
  orderNumber?: string;
  orderId?: string;
  buyerName?: string;
  note?: string;
  cardId?: string | null;
};

/** Site order lines (singles) plus private sales, newest first. */
export async function getSoldHistory(
  supabase: Client,
  limit = 200,
): Promise<SoldHistoryRow[]> {
  const [{ data: orderLines }, { data: privateRows }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, card_id, title_snapshot, price_snapshot, quantity, order_id, orders(order_number, buyer_name, created_at)")
      .not("card_id", "is", null)
      .order("id", { ascending: false })
      .limit(limit),
    supabase
      .from("private_sales")
      .select("*")
      .order("sold_at", { ascending: false })
      .limit(limit),
  ]);

  const siteRows: SoldHistoryRow[] = (orderLines ?? []).map((line) => {
    const order = line.orders as {
      order_number: string;
      buyer_name: string;
      created_at: string;
    } | null;
    return {
      id: `order-${line.id}`,
      soldAt: order?.created_at ?? new Date().toISOString(),
      title: line.title_snapshot,
      priceCad: Number(line.price_snapshot),
      quantity: line.quantity,
      source: "site" as const,
      orderNumber: order?.order_number,
      orderId: line.order_id,
      buyerName: order?.buyer_name,
      cardId: line.card_id,
    };
  });

  const privateHistory: SoldHistoryRow[] = (privateRows ?? []).map((row) => ({
    id: `private-${row.id}`,
    soldAt: row.sold_at,
    title: row.title_snapshot,
    priceCad: row.price_cad != null ? Number(row.price_cad) : null,
    quantity: row.quantity,
    source: "private" as const,
    buyerName: row.buyer_name ?? undefined,
    note: row.note ?? undefined,
    cardId: row.card_id,
  }));

  return [...siteRows, ...privateHistory]
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    .slice(0, limit);
}
