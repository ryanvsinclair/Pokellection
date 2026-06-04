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
  emailCallout,
  emailItemsTable,
  emailKeyValue,
  emailOrderBadge,
  emailTotals,
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

  const tableRows = items.map((item) => ({
    title: item.title_snapshot,
    quantity: item.quantity,
    lineTotal: formatCad(Number(item.price_snapshot) * item.quantity),
  }));

  const totalLines: { label: string; value: string; emphasize?: boolean }[] = [
    { label: "Subtotal", value: formatCad(order.subtotal_cad) },
  ];
  if (Number(order.shipping_fee_cad) > 0) {
    totalLines.push({
      label: "Shipping / fees",
      value: formatCad(order.shipping_fee_cad),
    });
  }
  totalLines.push({
    label: "Total",
    value: formatCad(order.total_cad),
    emphasize: true,
  });

  let paymentHtml = "";
  if (pricingReviewOpen) {
    paymentHtml = emailCallout(
      "info",
      "Price review in progress",
      `<p style="margin:0 0 8px;">We are reviewing your order against current market prices. We will email you when your total is ready — please wait before sending an e-transfer.</p>
      ${
        order.pricing_review_message
          ? `<p style="margin:0;"><strong>Your note:</strong> ${escapeHtml(order.pricing_review_message)}</p>`
          : ""
      }`,
    );
  } else if (prepay && hasDeposit && dueNow > 0) {
    paymentHtml = emailCallout(
      "payment",
      "E-transfer deposit required",
      `<p style="margin:0 0 8px;">Send <strong>${escapeHtml(formatCad(dueNow))}</strong> to <strong>${escapeHtml(etransferEmail)}</strong></p>
      <p style="margin:0 0 8px;">Memo: <strong>${escapeHtml(order.order_number)}</strong></p>
      <p style="margin:0;">Balance due on delivery: <strong>${escapeHtml(formatCad(balanceOnDelivery))}</strong> (non-refundable deposit).</p>
      ${settings?.etransfer_instructions ? `<p style="margin:12px 0 0;">${escapeHtml(settings.etransfer_instructions)}</p>` : ""}`,
    );
  } else if (prepay && dueNow > 0) {
    paymentHtml = emailCallout(
      "payment",
      "E-transfer instructions",
      `<p style="margin:0 0 8px;">Send <strong>${escapeHtml(formatCad(dueNow))}</strong> to <strong>${escapeHtml(etransferEmail)}</strong></p>
      <p style="margin:0;">Memo: <strong>${escapeHtml(order.order_number)}</strong></p>
      ${settings?.etransfer_instructions ? `<p style="margin:12px 0 0;">${escapeHtml(settings.etransfer_instructions)}</p>` : ""}`,
    );
  } else {
    paymentHtml = emailCallout(
      "success",
      "Payment on pickup",
      `<p style="margin:0;">Pay when we meet — cash or e-transfer at pickup.</p>`,
    );
  }

  const bodyHtml = `
    ${emailKeyValue([
      { label: "Order", valueHtml: emailOrderBadge(order.order_number) },
      { label: "Placed", valueHtml: escapeHtml(placedAt) },
      { label: "Fulfillment", valueHtml: escapeHtml(fulfillmentLabel) },
    ])}
    ${emailItemsTable(tableRows)}
    ${emailTotals(totalLines)}
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
    html: wrapEmailHtml(`Order ${order.order_number}`, bodyHtml, {
      preheader: `Your order ${order.order_number} is confirmed.`,
      headline: `Thanks, ${escapeHtml(order.buyer_name)}!`,
      lead: "We received your order and will keep you updated by email.",
    }),
    text: textLines.join("\n"),
  };
}
