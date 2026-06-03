"use server";

import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { FulfillmentStatus, PaymentStatus } from "@/types/database";

const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "pending",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["awaiting_transfer", "received", "refunded"];

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

  await supabase
    .from("orders")
    .update({
      tracking_number: trackingNumber,
      fulfillment_status: fulfillmentStatus,
      payment_status: paymentStatus,
    })
    .eq("id", orderId);

  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "completed") {
    const { data: items } = await supabase
      .from("order_items")
      .select("card_id")
      .eq("order_id", orderId);

    for (const item of items ?? []) {
      if (!item.card_id) continue;
      await supabase.from("cards").update({ status: "sold" }).eq("id", item.card_id);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
}
