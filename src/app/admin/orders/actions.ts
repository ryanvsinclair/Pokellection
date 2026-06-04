"use server";

import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import { markCardSoldUpdate } from "@/lib/card-sold";
import { sendPricingReviewResolvedEmail } from "@/lib/email/pricing-review";
import { orderHasOpenPricingReview } from "@/lib/order-pricing-review";
import { createClient } from "@/lib/supabase/server";
import type { FulfillmentStatus, PaymentStatus } from "@/types/database";

function parseCadAmount(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "pending",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "awaiting_transfer",
  "deposit_received",
  "received",
  "refunded",
];

export async function updateOrder(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return;

  const supabase = await createClient();
  await assertManager(supabase);

  const trackingNumber = String(formData.get("tracking_number") ?? "").trim() || null;
  const rawFulfillment = String(formData.get("fulfillment_status") ?? "pending");
  const fulfillmentStatus: FulfillmentStatus = FULFILLMENT_STATUSES.includes(
    rawFulfillment as FulfillmentStatus,
  )
    ? (rawFulfillment as FulfillmentStatus)
    : "pending";
  const rawPayment = String(formData.get("payment_status") ?? "awaiting_transfer");
  const paymentStatus: PaymentStatus = PAYMENT_STATUSES.includes(rawPayment as PaymentStatus)
    ? (rawPayment as PaymentStatus)
    : "awaiting_transfer";

  const { data: existing } = await supabase
    .from("orders")
    .select(
      "order_number, fulfillment_option, shipping_fee_cad, subtotal_cad, total_cad, pricing_review_requested_at, pricing_review_resolved_at",
    )
    .eq("id", orderId)
    .single();

  if (!existing) return;

  const resolvePricingReview = formData.get("resolve_pricing_review") === "1";
  const subtotalRaw = String(formData.get("subtotal_cad") ?? "").trim();
  const subtotalCad =
    subtotalRaw.length > 0 ? parseCadAmount(subtotalRaw) : Number(existing.subtotal_cad);

  if (subtotalCad === null) return;

  const totalCad = subtotalCad + Number(existing.shipping_fee_cad);
  const pricingReviewOpen = orderHasOpenPricingReview(existing);

  const updatePayload: {
    tracking_number: string | null;
    fulfillment_status: FulfillmentStatus;
    payment_status: PaymentStatus;
    subtotal_cad: number;
    total_cad: number;
    pricing_review_resolved_at?: string;
  } = {
    tracking_number: trackingNumber,
    fulfillment_status: fulfillmentStatus,
    payment_status: paymentStatus,
    subtotal_cad: subtotalCad,
    total_cad: totalCad,
  };

  const resolvingPricingReview = pricingReviewOpen && resolvePricingReview;
  if (resolvingPricingReview) {
    updatePayload.pricing_review_resolved_at = new Date().toISOString();
  }

  await supabase.from("orders").update(updatePayload).eq("id", orderId);

  if (resolvingPricingReview) {
    try {
      await sendPricingReviewResolvedEmail(supabase, orderId);
    } catch (emailError) {
      console.error("[email] pricing review resolved send failed:", emailError);
    }
  }

  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "completed") {
    const { data: items } = await supabase
      .from("order_items")
      .select("card_id")
      .eq("order_id", orderId);

    for (const item of items ?? []) {
      if (!item.card_id) continue;
      await supabase.from("cards").update(markCardSoldUpdate()).eq("id", item.card_id);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  if (existing.order_number) {
    revalidatePath(`/account/orders/${existing.order_number}`);
  }
}
