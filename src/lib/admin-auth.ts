import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function assertManager(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "manager") {
    throw new Error("Forbidden");
  }

  return user;
}
