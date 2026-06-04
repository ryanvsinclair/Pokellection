import type { Order } from "@/types/database";
import { getTrackingUrl } from "@/lib/tracking";
import {
  emailButton,
  emailParagraph,
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
    ${emailParagraph(`Hi ${escapeHtml(order.buyer_name)},`)}
    ${emailParagraph(`Your order <strong>${escapeHtml(order.order_number)}</strong> has shipped.`)}
    ${emailParagraph(`<strong>Tracking:</strong> ${escapeHtml(tracking)}`)}
    ${emailButton(trackingUrl, "Track package")}
    ${emailButton(orderUrl, "View your order")}
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
    html: wrapEmailHtml(`Order ${order.order_number} shipped`, bodyHtml),
    text,
  };
}
