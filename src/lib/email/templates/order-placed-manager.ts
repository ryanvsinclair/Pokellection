import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
import { orderHasOpenPricingReview } from "@/lib/order-pricing-review";
import type { Order, OrderItem } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailParagraph,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

type OrderShippingAddress = {
  delivery_area?: string;
  pickup_area?: string;
};

export function buildManagerOrderAlertEmail(
  order: Order,
  items: OrderItem[],
): { subject: string; html: string; text: string } {
  const adminUrl = `${getSiteUrl()}/admin/orders/${order.id}`;
  const fulfillmentLabel = formatFulfillmentOptionLabel(
    order.fulfillment_option,
    order.shipping_address as OrderShippingAddress | null,
  );
  const pricingReviewOpen = orderHasOpenPricingReview(order);
  const itemSummary = items
    .map((item) => `${item.title_snapshot} × ${item.quantity}`)
    .join("; ");

  const reviewBlock = pricingReviewOpen
    ? `<div style="margin:16px 0;padding:12px;background:#fef3c7;border-radius:8px;">
        <p style="margin:0;font-weight:600;">Price review requested</p>
        ${
          order.pricing_review_message
            ? `<p style="margin:8px 0 0;">${escapeHtml(order.pricing_review_message)}</p>`
            : `<p style="margin:8px 0 0;">Buyer asked for a market price review before e-transfer.</p>`
        }
      </div>`
    : "";

  const bodyHtml = `
    ${emailParagraph(`<strong>New order:</strong> ${escapeHtml(order.order_number)}`)}
    ${emailParagraph(`<strong>Buyer:</strong> ${escapeHtml(order.buyer_name)}<br>
      <a href="mailto:${escapeHtml(order.buyer_email)}">${escapeHtml(order.buyer_email)}</a><br>
      ${escapeHtml(order.buyer_phone)}`)}
    ${emailParagraph(`<strong>Fulfillment:</strong> ${escapeHtml(fulfillmentLabel)}`)}
    ${emailParagraph(`<strong>Total:</strong> ${escapeHtml(formatCad(order.total_cad))} (subtotal ${escapeHtml(formatCad(order.subtotal_cad))}, fees ${escapeHtml(formatCad(order.shipping_fee_cad))})`)}
    ${emailParagraph(`<strong>Items:</strong> ${escapeHtml(itemSummary)}`)}
    ${reviewBlock}
    ${emailButton(adminUrl, "Open in admin")}
  `;

  const text = [
    `New order: ${order.order_number}`,
    `Buyer: ${order.buyer_name} · ${order.buyer_email} · ${order.buyer_phone}`,
    `Fulfillment: ${fulfillmentLabel}`,
    `Total: ${formatCad(order.total_cad)}`,
    `Items: ${itemSummary}`,
    pricingReviewOpen
      ? `PRICE REVIEW: ${order.pricing_review_message ?? "(no message)"}`
      : null,
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: pricingReviewOpen
      ? `[Price review] New order ${order.order_number}`
      : `New order ${order.order_number}`,
    html: wrapEmailHtml(`New order ${order.order_number}`, bodyHtml),
    text,
  };
}
