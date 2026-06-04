import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
import { orderHasOpenPricingReview } from "@/lib/order-pricing-review";
import {
  getBalanceDueOnDelivery,
  getEtransferAmountDueNow,
  orderHasDeliveryDeposit,
  orderRequiresPrepayEtransfer,
} from "@/lib/order-payment";
import type { Order, OrderItem } from "@/types/database";
import { formatCad, getEtransferEmail } from "@/lib/utils";
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

export type BuyerOrderEmailSettings = {
  etransfer_email?: string | null;
  etransfer_instructions?: string | null;
};

export function buildBuyerOrderConfirmationEmail(
  order: Order,
  items: OrderItem[],
  settings: BuyerOrderEmailSettings | null,
): { subject: string; html: string; text: string } {
  const orderUrl = `${getSiteUrl()}/account/orders/${encodeURIComponent(order.order_number)}`;
  const placedAt = new Date(order.created_at).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const fulfillmentLabel = formatFulfillmentOptionLabel(
    order.fulfillment_option,
    order.shipping_address as OrderShippingAddress | null,
  );
  const pricingReviewOpen = orderHasOpenPricingReview(order);
  const prepay = orderRequiresPrepayEtransfer(order);
  const hasDeposit = orderHasDeliveryDeposit(order);
  const dueNow = getEtransferAmountDueNow(order);
  const balanceOnDelivery = getBalanceDueOnDelivery(order);
  const etransferEmail = getEtransferEmail(settings);

  const lineRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.title_snapshot)} × ${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatCad(Number(item.price_snapshot) * item.quantity))}</td>
        </tr>`,
    )
    .join("");

  let paymentHtml = "";
  if (pricingReviewOpen) {
    paymentHtml = `
      <div style="margin:16px 0;padding:12px;background:#f5f3ff;border-radius:8px;">
        <p style="margin:0;font-weight:600;">Price review requested</p>
        <p style="margin:8px 0 0;">We are reviewing your order against current market prices. We will email you when your total is ready — please wait before sending an e-transfer.</p>
        ${
          order.pricing_review_message
            ? `<p style="margin:8px 0 0;"><strong>Your note:</strong> ${escapeHtml(order.pricing_review_message)}</p>`
            : ""
        }
      </div>`;
  } else if (prepay && hasDeposit && dueNow > 0) {
    paymentHtml = `
      <div style="margin:16px 0;padding:12px;background:#fffbeb;border-radius:8px;">
        <p style="margin:0;font-weight:600;">E-transfer deposit required</p>
        <p style="margin:8px 0 0;">Send <strong>${escapeHtml(formatCad(dueNow))}</strong> to <strong>${escapeHtml(etransferEmail)}</strong></p>
        <p style="margin:8px 0 0;">Memo: <strong>${escapeHtml(order.order_number)}</strong></p>
        <p style="margin:8px 0 0;">Balance due on delivery: ${escapeHtml(formatCad(balanceOnDelivery))} (non-refundable deposit).</p>
        ${settings?.etransfer_instructions ? `<p style="margin:8px 0 0;">${escapeHtml(settings.etransfer_instructions)}</p>` : ""}
      </div>`;
  } else if (prepay && dueNow > 0) {
    paymentHtml = `
      <div style="margin:16px 0;padding:12px;background:#fffbeb;border-radius:8px;">
        <p style="margin:0;font-weight:600;">E-transfer instructions</p>
        <p style="margin:8px 0 0;">Send <strong>${escapeHtml(formatCad(dueNow))}</strong> to <strong>${escapeHtml(etransferEmail)}</strong></p>
        <p style="margin:8px 0 0;">Memo: <strong>${escapeHtml(order.order_number)}</strong></p>
        ${settings?.etransfer_instructions ? `<p style="margin:8px 0 0;">${escapeHtml(settings.etransfer_instructions)}</p>` : ""}
      </div>`;
  } else {
    paymentHtml = emailParagraph(
      `<strong>Payment:</strong> Pay on pickup (cash or e-transfer when we meet).`,
    );
  }

  const bodyHtml = `
    ${emailParagraph(`Thanks for your order, ${escapeHtml(order.buyer_name)}!`)}
    ${emailParagraph(`<strong>Order:</strong> ${escapeHtml(order.order_number)}<br><strong>Placed:</strong> ${escapeHtml(placedAt)}`)}
    ${emailParagraph(`<strong>Fulfillment:</strong> ${escapeHtml(fulfillmentLabel)}`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 0;border-bottom:2px solid #ddd;">Item</th>
          <th style="text-align:right;padding:8px 0;border-bottom:2px solid #ddd;">Price</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
    ${emailParagraph(`Subtotal: ${escapeHtml(formatCad(order.subtotal_cad))}`)}
    ${Number(order.shipping_fee_cad) > 0 ? emailParagraph(`Shipping / fees: ${escapeHtml(formatCad(order.shipping_fee_cad))}`) : ""}
    ${emailParagraph(`<strong>Total: ${escapeHtml(formatCad(order.total_cad))}</strong>`)}
    ${paymentHtml}
    ${emailButton(orderUrl, "View your order")}
  `;

  const textLines = [
    `Thanks for your order, ${order.buyer_name}!`,
    `Order: ${order.order_number}`,
    `Placed: ${placedAt}`,
    `Fulfillment: ${fulfillmentLabel}`,
    "",
    ...items.map(
      (item) =>
        `- ${item.title_snapshot} × ${item.quantity}: ${formatCad(Number(item.price_snapshot) * item.quantity)}`,
    ),
    "",
    `Subtotal: ${formatCad(order.subtotal_cad)}`,
    Number(order.shipping_fee_cad) > 0
      ? `Shipping / fees: ${formatCad(order.shipping_fee_cad)}`
      : null,
    `Total: ${formatCad(order.total_cad)}`,
    "",
    pricingReviewOpen
      ? "Price review in progress — we will email you when your total is ready before e-transfer."
      : prepay && dueNow > 0
        ? `E-transfer ${formatCad(dueNow)} to ${etransferEmail}, memo: ${order.order_number}`
        : "Pay on pickup.",
    "",
    `View order: ${orderUrl}`,
  ].filter(Boolean) as string[];

  return {
    subject: `Order confirmed — ${order.order_number}`,
    html: wrapEmailHtml(`Order ${order.order_number}`, bodyHtml),
    text: textLines.join("\n"),
  };
}
