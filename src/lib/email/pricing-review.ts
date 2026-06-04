import { sendEmail } from "@/lib/email/send";
import { buildPricingReviewResolvedEmail } from "@/lib/email/templates/pricing-review-resolved";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Notify buyer they can e-transfer after manager resolves a price review. Fail-open. */
export async function sendPricingReviewResolvedEmail(
  supabase: Client,
  orderId: string,
): Promise<void> {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("[email] pricing review resolved: order not found", orderId, error?.message);
    return;
  }

  if (!order.pricing_review_resolved_at || !order.pricing_review_requested_at) {
    return;
  }

  const buyerEmail = order.buyer_email?.trim();
  if (!buyerEmail) {
    console.warn("[email] pricing review resolved: no buyer email", orderId);
    return;
  }

  const { data: settings } = await supabase
    .from("site_settings")
    .select("etransfer_email, etransfer_instructions")
    .eq("id", 1)
    .maybeSingle();

  const payload = buildPricingReviewResolvedEmail(order, settings);
  const result = await sendEmail({
    to: buyerEmail,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  if (!result.ok) {
    if ("skipped" in result && result.skipped) {
      console.warn("[email] pricing review resolved skipped:", result.reason);
    } else {
      console.error("[email] pricing review resolved failed:", result);
    }
  }
}
