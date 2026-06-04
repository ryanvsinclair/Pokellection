import { sendEmail } from "@/lib/email/send";
import { buildReservationBuyerEmail } from "@/lib/email/templates/reservation-buyer";
import { buildReservationManagerEmail } from "@/lib/email/templates/reservation-manager";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Buyer confirmation + manager alert after a shop pickup reservation. Fail-open. */
export async function sendReservationEmails(
  supabase: Client,
  reservationId: string,
): Promise<void> {
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .single();

  if (error || !reservation) {
    console.error("[email] reservation: not found", reservationId, error?.message);
    return;
  }

  const { data: card } = await supabase
    .from("cards")
    .select("title, slug, price_cad")
    .eq("id", reservation.card_id)
    .single();

  const cardTitle = card?.title?.trim() || "Card";
  const cardSlug = card?.slug?.trim() || reservation.card_id;
  const cardPriceCad = Number(card?.price_cad ?? 0);

  const buyerEmail = reservation.buyer_email?.trim();
  if (buyerEmail) {
    const buyer = buildReservationBuyerEmail({ reservation, cardTitle, cardSlug });
    const buyerResult = await sendEmail({
      to: buyerEmail,
      subject: buyer.subject,
      html: buyer.html,
      text: buyer.text,
    });
    if (!buyerResult.ok) {
      if ("skipped" in buyerResult && buyerResult.skipped) {
        console.warn("[email] reservation buyer skipped:", buyerResult.reason);
      } else {
        console.error("[email] reservation buyer failed:", buyerResult);
      }
    }
  }

  const { data: settings } = await supabase
    .from("site_settings")
    .select("contact_email")
    .eq("id", 1)
    .maybeSingle();

  const manager = buildReservationManagerEmail({
    reservation,
    cardTitle,
    cardPriceCad,
    settings,
  });
  const managerResult = await sendEmail({
    to: manager.to,
    subject: manager.subject,
    html: manager.html,
    text: manager.text,
    replyTo: reservation.buyer_email?.trim() || undefined,
  });
  if (!managerResult.ok) {
    if ("skipped" in managerResult && managerResult.skipped) {
      console.warn("[email] reservation manager skipped:", managerResult.reason);
    } else {
      console.error("[email] reservation manager failed:", managerResult);
    }
  }
}
