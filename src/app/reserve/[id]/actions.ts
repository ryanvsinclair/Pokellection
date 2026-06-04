"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicCatalogSeo } from "@/lib/seo-revalidate";
import { redirect } from "next/navigation";
import { getUserProfileRole, isBuyer } from "@/lib/auth-roles";
import { buyerSignupPath } from "@/lib/buyer-auth-paths";
import { sendReservationEmails } from "@/lib/email/reservation";
import { createClient } from "@/lib/supabase/server";

export type ReserveCardResult = { ok: true } | { ok: false; error: string };

export async function reserveCardForPickupAction(
  _prev: ReserveCardResult | null,
  formData: FormData,
): Promise<ReserveCardResult> {
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return { ok: false, error: "Missing card." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buyerSignupPath(`/reserve/${cardId}`));
  }

  const role = await getUserProfileRole(supabase, user.id);
  if (!isBuyer(role)) {
    return { ok: false, error: "Shopper account required." };
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id, slug, status")
    .eq("id", cardId)
    .eq("status", "available")
    .maybeSingle();

  if (!card) {
    return { ok: false, error: "This card is no longer available to reserve." };
  }

  const expiresAt = new Date();
  expiresAt.setHours(23, 59, 59, 999);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", user.id)
    .single();

  const buyerName =
    String(formData.get("buyer_name") ?? "").trim() ||
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Buyer";
  const buyerEmail = user.email ?? String(formData.get("buyer_email") ?? "");
  const buyerPhone =
    String(formData.get("buyer_phone") ?? "").trim() || profile?.phone?.trim() || "";

  if (!buyerPhone) {
    return { ok: false, error: "Add a phone number on your account or in the form." };
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      card_id: cardId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      status: "pending",
      reserved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      notes: String(formData.get("notes") || "") || null,
    })
    .select("id")
    .single();

  if (reservationError || !reservation) {
    return { ok: false, error: reservationError?.message ?? "Reservation failed." };
  }

  try {
    await sendReservationEmails(supabase, reservation.id);
  } catch (emailError) {
    console.error("[email] reservation send failed:", emailError);
  }

  revalidatePath("/shop");
  revalidatePath(`/shop/${card.slug}`);
  revalidatePath("/admin/reservations");
  revalidatePublicCatalogSeo();
  redirect("/account/orders?reserved=1");
}
