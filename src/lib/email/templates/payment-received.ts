import {
  getBalanceDueOnDelivery,
  orderHasDeliveryDeposit,
} from "@/lib/order-payment";
import type { Order } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailCallout,
  emailOrderBadge,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

export type PaymentReceivedKind = "deposit" | "full";

export function buildPaymentReceivedEmail(
  order: Order,
  kind: PaymentReceivedKind,
): { subject: string; html: string; text: string } {
  const orderUrl = `${getSiteUrl()}/account/orders/${encodeURIComponent(order.order_number)}`;
  const hasDeposit = orderHasDeliveryDeposit(order);
  const balance = getBalanceDueOnDelivery(order);

  let calloutTitle = "";
  let calloutBody = "";
  let detailText = "";

  if (kind === "deposit") {
    calloutTitle = "Deposit received";
    calloutBody = `<p style="margin:0;">We received your e-transfer deposit of <strong>${escapeHtml(formatCad(order.deposit_cad))}</strong> for order ${emailOrderBadge(order.order_number)}.</p>`;
    detailText = `We received your deposit of ${formatCad(order.deposit_cad)}.`;
    if (balance > 0) {
      calloutBody += `<p style="margin:12px 0 0;">The remaining <strong>${escapeHtml(formatCad(balance))}</strong> is due when your order is delivered.</p>`;
      detailText += ` Balance due on delivery: ${formatCad(balance)}.`;
    }
  } else if (hasDeposit && Number(order.deposit_cad) > 0) {
    calloutTitle = "Order fully paid";
    calloutBody = `<p style="margin:0;">Order ${emailOrderBadge(order.order_number)} is fully paid — total <strong>${escapeHtml(formatCad(order.total_cad))}</strong>.</p>`;
    detailText = `Order fully paid — total ${formatCad(order.total_cad)}.`;
  } else {
    calloutTitle = "Payment received";
    calloutBody = `<p style="margin:0;">We received your e-transfer of <strong>${escapeHtml(formatCad(order.total_cad))}</strong> for order ${emailOrderBadge(order.order_number)}. Thank you!</p>`;
    detailText = `We received your payment of ${formatCad(order.total_cad)}.`;
  }

  const subject =
    kind === "deposit"
      ? `Deposit received — ${order.order_number}`
      : `Payment received — ${order.order_number}`;

  const bodyHtml = `
    ${emailCallout("success", calloutTitle, calloutBody)}
    ${emailButton(orderUrl, "View your order")}
  `;

  const text = [`Hi ${order.buyer_name},`, detailText, `View order: ${orderUrl}`].join("\n");

  return {
    subject,
    html: wrapEmailHtml(subject, bodyHtml, {
      preheader: detailText,
      headline: kind === "deposit" ? "Deposit received" : "Payment received",
      lead: `Hi ${escapeHtml(order.buyer_name)},`,
    }),
    text,
  };
}
