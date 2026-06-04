import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
import { orderHasOpenPricingReview } from "@/lib/order-pricing-review";
import type { Order, OrderItem } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailCallout,
  emailKeyValue,
  emailMailto,
  emailOrderBadge,
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
    ? emailCallout(
        "warning",
        "Price review requested",
        order.pricing_review_message
          ? `<p style="margin:0;">${escapeHtml(order.pricing_review_message)}</p>`
          : `<p style="margin:0;">Buyer asked for a market price review before e-transfer.</p>`,
      )
    : "";

  const bodyHtml = `
    ${emailKeyValue([
      { label: "Order", valueHtml: emailOrderBadge(order.order_number) },
      {
        label: "Buyer",
        valueHtml: `${escapeHtml(order.buyer_name)}<br>${emailMailto(order.buyer_email)}<br>${escapeHtml(order.buyer_phone)}`,
      },
      { label: "Fulfillment", valueHtml: escapeHtml(fulfillmentLabel) },
      {
        label: "Total",
        valueHtml: `<strong>${escapeHtml(formatCad(order.total_cad))}</strong> <span style="color:#64748b;">(subtotal ${escapeHtml(formatCad(order.subtotal_cad))}, fees ${escapeHtml(formatCad(order.shipping_fee_cad))})</span>`,
      },
      { label: "Items", valueHtml: escapeHtml(itemSummary) },
    ])}
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
    html: wrapEmailHtml(`New order ${order.order_number}`, bodyHtml, {
      preheader: `New order ${order.order_number} from ${order.buyer_name}.`,
      headline: "New order",
      lead: `${escapeHtml(order.buyer_name)} placed an order.`,
    }),
    text,
  };
}
