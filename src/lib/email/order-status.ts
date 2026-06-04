import { sendEmail } from "@/lib/email/send";
import { buildOrderShippedEmail } from "@/lib/email/templates/order-shipped";
import {
  buildPaymentReceivedEmail,
  type PaymentReceivedKind,
} from "@/lib/email/templates/payment-received";
import { buildReadyForPickupEmail } from "@/lib/email/templates/ready-for-pickup";
import type { Order, PaymentStatus } from "@/types/database";

async function emailBuyer(
  order: Order,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const to = order.buyer_email?.trim();
  if (!to) {
    console.warn("[email] order status: no buyer email", order.order_number);
    return;
  }

  const result = await sendEmail({ to, subject, html, text });
  if (!result.ok) {
    if ("skipped" in result && result.skipped) {
      console.warn("[email] order status skipped:", result.reason);
    } else {
      console.error("[email] order status failed:", result);
    }
  }
}

function paymentReceivedKind(
  before: PaymentStatus,
  after: PaymentStatus,
): PaymentReceivedKind | null {
  if (before === after) return null;
  if (after === "deposit_received") return "deposit";
  if (after === "received") return "full";
  return null;
}

function shouldSendShippedEmail(before: Order, after: Order): boolean {
  const tracking = after.tracking_number?.trim();
  if (!tracking) return false;
  if (after.fulfillment_status !== "shipped") return false;

  if (before.fulfillment_status !== "shipped" && after.fulfillment_status === "shipped") {
    return true;
  }

  const beforeTracking = before.tracking_number?.trim() ?? "";
  return beforeTracking !== tracking;
}

/**
 * Sends buyer emails when admin updates payment or fulfillment on an order.
 * Compares before/after snapshots; only sends when relevant fields change.
 */
export async function sendOrderStatusEmails(before: Order, after: Order): Promise<void> {
  const kind = paymentReceivedKind(before.payment_status, after.payment_status);
  if (kind) {
    const payload = buildPaymentReceivedEmail(after, kind);
    await emailBuyer(after, payload.subject, payload.html, payload.text);
  }

  if (
    before.fulfillment_status !== after.fulfillment_status &&
    after.fulfillment_status === "ready_for_pickup"
  ) {
    const payload = buildReadyForPickupEmail(after);
    await emailBuyer(after, payload.subject, payload.html, payload.text);
  }

  if (shouldSendShippedEmail(before, after)) {
    const payload = buildOrderShippedEmail(after);
    await emailBuyer(after, payload.subject, payload.html, payload.text);
  }
}
