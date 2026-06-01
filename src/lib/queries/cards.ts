import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** All cards currently for sale, highest price first. */
export async function getAvailableCards(supabase: Client): Promise<Card[]> {
  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "available")
    .order("price_cad", { ascending: false })
    .order("title", { ascending: true });
  return data ?? [];
}

/** A single available card by slug, or null. Use for public detail pages. */
export async function getAvailableCardBySlug(
  supabase: Client,
  slug: string,
): Promise<Card | null> {
  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", slug)
    .eq("status", "available")
    .single();
  return data ?? null;
}

/** Any card by id regardless of status (manager contexts). */
export async function getCardById(supabase: Client, id: string): Promise<Card | null> {
  const { data } = await supabase.from("cards").select("*").eq("id", id).single();
  return data ?? null;
}

/** All cards, newest first (manager listing). */
export async function getAllCards(supabase: Client): Promise<Card[]> {
  const { data } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
