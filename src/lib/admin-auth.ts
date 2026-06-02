import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getUserProfileRole, isManager } from "@/lib/auth-roles";
import type { Database } from "@/types/database";

/** Server layouts/pages: redirect guests and non-managers away from /admin. */
export async function requireManagerPage(
  supabase: SupabaseClient<Database>,
  returnPath = "/admin",
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }

  const role = await getUserProfileRole(supabase, user.id);

  if (!isManager(role)) {
    redirect("/account");
  }

  return user;
}

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
