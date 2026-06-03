import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/types/database";

type Client = SupabaseClient<Database>;

export function isManager(role: UserRole | null | undefined): role is "manager" {
  return role === "manager";
}

export function isBuyer(role: UserRole | null | undefined): role is "buyer" {
  return role === "buyer";
}

export async function getUserProfileRole(
  supabase: Client,
  userId: string,
): Promise<UserRole | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role ?? null;
}

/** Signed-in shopper who may use cart, checkout, and reservations. */
export async function canPurchaseAsBuyer(
  supabase: Client,
  userId: string | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const role = await getUserProfileRole(supabase, userId);
  return isBuyer(role);
}
