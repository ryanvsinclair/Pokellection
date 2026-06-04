import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
import type { Order } from "@/types/database";
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

export function buildReadyForPickupEmail(
  order: Order,
): { subject: string; html: string; text: string } {
  const orderUrl = `${getSiteUrl()}/account/orders/${encodeURIComponent(order.order_number)}`;
  const fulfillmentLabel = formatFulfillmentOptionLabel(
    order.fulfillment_option,
    order.shipping_address as OrderShippingAddress | null,
  );

  const bodyHtml = `
    ${emailParagraph(`Hi ${escapeHtml(order.buyer_name)},`)}
    ${emailParagraph(`Your order <strong>${escapeHtml(order.order_number)}</strong> is ready for pickup.`)}
    ${emailParagraph(`<strong>Fulfillment:</strong> ${escapeHtml(fulfillmentLabel)}`)}
    ${emailParagraph("Bring your order number when you arrive. Pay on pickup if you have not paid by e-transfer yet.")}
    ${emailButton(orderUrl, "View your order")}
  `;

  const text = [
    `Hi ${order.buyer_name},`,
    `Order ${order.order_number} is ready for pickup.`,
    fulfillmentLabel,
    `View order: ${orderUrl}`,
  ].join("\n");

  return {
    subject: `Ready for pickup — ${order.order_number}`,
    html: wrapEmailHtml(`Order ${order.order_number} ready`, bodyHtml),
    text,
  };
}
