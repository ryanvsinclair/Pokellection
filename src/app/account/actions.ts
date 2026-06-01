"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUpBuyer(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    redirect(`/account/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  redirect("/account");
}

export async function signInBuyer(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/account");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/account/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (profile?.role === "manager") {
    redirect("/admin");
  }

  redirect(redirectTo);
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
    })
    .eq("id", user.id);

  revalidatePath("/account");
  revalidatePath("/checkout");
}
