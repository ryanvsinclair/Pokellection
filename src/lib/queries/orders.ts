import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Orders belonging to a buyer, newest first. */
export async function getOrdersForBuyer(
  supabase: Client,
  buyerId: string,
): Promise<Order[]> {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** A single order by its public order number, or null. */
export async function getOrderByNumber(
  supabase: Client,
  orderNumber: string,
): Promise<Order | null> {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();
  return data ?? null;
}

/** All orders, newest first (manager listing). */
export async function getAllOrders(supabase: Client): Promise<Order[]> {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
