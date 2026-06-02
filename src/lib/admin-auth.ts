import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserProfileRole, isManager } from "@/lib/auth-roles";
import type { Database } from "@/types/database";

export async function assertManager(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getUserProfileRole(supabase, user.id);

  if (!isManager(role)) {
    throw new Error("Forbidden");
  }

  return user;
}
