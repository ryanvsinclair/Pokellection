import {
  getBalanceDueOnDelivery,
  orderHasDeliveryDeposit,
} from "@/lib/order-payment";
import type { Order } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailParagraph,
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

  let detailHtml = "";
  let detailText = "";

  if (kind === "deposit") {
    detailHtml = emailParagraph(
      `We received your e-transfer deposit of <strong>${escapeHtml(formatCad(order.deposit_cad))}</strong> for order <strong>${escapeHtml(order.order_number)}</strong>.`,
    );
    detailText = `We received your deposit of ${formatCad(order.deposit_cad)}.`;
    if (balance > 0) {
      detailHtml += emailParagraph(
        `The remaining <strong>${escapeHtml(formatCad(balance))}</strong> is due when your order is delivered.`,
      );
      detailText += ` Balance due on delivery: ${formatCad(balance)}.`;
    }
  } else {
    if (hasDeposit && Number(order.deposit_cad) > 0) {
      detailHtml = emailParagraph(
        `Your order <strong>${escapeHtml(order.order_number)}</strong> is fully paid. We received your payment (total <strong>${escapeHtml(formatCad(order.total_cad))}</strong>).`,
      );
      detailText = `Order fully paid — total ${formatCad(order.total_cad)}.`;
    } else {
      detailHtml = emailParagraph(
        `We received your e-transfer of <strong>${escapeHtml(formatCad(order.total_cad))}</strong> for order <strong>${escapeHtml(order.order_number)}</strong>. Thank you!`,
      );
      detailText = `We received your payment of ${formatCad(order.total_cad)}.`;
    }
  }

  const bodyHtml = `
    ${emailParagraph(`Hi ${escapeHtml(order.buyer_name)},`)}
    ${detailHtml}
    ${emailButton(orderUrl, "View your order")}
  `;

  const subject =
    kind === "deposit"
      ? `Deposit received — ${order.order_number}`
      : `Payment received — ${order.order_number}`;

  const text = [`Hi ${order.buyer_name},`, detailText, `View order: ${orderUrl}`].join("\n");

  return {
    subject,
    html: wrapEmailHtml(subject, bodyHtml),
    text,
  };
}
