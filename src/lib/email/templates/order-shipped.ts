import type { Order } from "@/types/database";
import { getTrackingUrl } from "@/lib/tracking";
import {
  emailButtonGroup,
  emailKeyValue,
  emailOrderBadge,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

export function buildOrderShippedEmail(
  order: Order,
): { subject: string; html: string; text: string } {
  const orderUrl = `${getSiteUrl()}/account/orders/${encodeURIComponent(order.order_number)}`;
  const tracking = order.tracking_number?.trim() ?? "";
  const trackingUrl = getTrackingUrl(tracking);

  const bodyHtml = `
    ${emailKeyValue([
      { label: "Order", valueHtml: emailOrderBadge(order.order_number) },
      {
        label: "Tracking",
        valueHtml: `<span style="font-family:ui-monospace,monospace;font-weight:600;">${escapeHtml(tracking)}</span>`,
      },
    ])}
    ${emailButtonGroup([
      { href: trackingUrl, label: "Track package", primary: true },
      { href: orderUrl, label: "View your order", primary: false },
    ])}
  `;

  const text = [
    `Hi ${order.buyer_name},`,
    `Your order ${order.order_number} has shipped.`,
    `Tracking: ${tracking}`,
    `Track: ${trackingUrl}`,
    `View order: ${orderUrl}`,
  ].join("\n");

  return {
    subject: `Your order ${order.order_number} has shipped`,
    html: wrapEmailHtml(`Order ${order.order_number} shipped`, bodyHtml, {
      preheader: `Tracking: ${tracking}`,
      headline: "Your order has shipped",
      lead: `Hi ${escapeHtml(order.buyer_name)}, your package is on the way.`,
    }),
    text,
  };
}
