import type { SupabaseClient } from "@supabase/supabase-js";
import { logSupabaseFetchError } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Cards with an active same-day pickup hold (pending reservation). */
export async function getPendingReservationCardIds(supabase: Client): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("reservations")
    .select("card_id")
    .eq("status", "pending");

  if (error) {
    logSupabaseFetchError("getPendingReservationCardIds", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.card_id));
}
