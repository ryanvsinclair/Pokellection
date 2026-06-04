import type { Order } from "@/types/database";
import { getEtransferAmountDueNow } from "@/lib/order-payment";
import { formatCad, getEtransferEmail } from "@/lib/utils";
import type { BuyerOrderEmailSettings } from "@/lib/email/templates/order-placed-buyer";
import {
  emailButton,
  emailParagraph,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

export function buildPricingReviewResolvedEmail(
  order: Order,
  settings: BuyerOrderEmailSettings | null,
): { subject: string; html: string; text: string } {
  const orderUrl = `${getSiteUrl()}/account/orders/${encodeURIComponent(order.order_number)}`;
  const etransferEmail = getEtransferEmail(settings);
  const dueNow = getEtransferAmountDueNow({
    ...order,
    pricing_review_resolved_at: order.pricing_review_resolved_at ?? new Date().toISOString(),
  });

  const bodyHtml = `
    ${emailParagraph(`Hi ${escapeHtml(order.buyer_name)},`)}
    ${emailParagraph("Your order price review is complete. Here is your updated total:")}
    ${emailParagraph(`<strong>Subtotal:</strong> ${escapeHtml(formatCad(order.subtotal_cad))}`)}
    ${Number(order.shipping_fee_cad) > 0 ? emailParagraph(`<strong>Shipping:</strong> ${escapeHtml(formatCad(order.shipping_fee_cad))}`) : ""}
    ${emailParagraph(`<strong>Total:</strong> ${escapeHtml(formatCad(order.total_cad))}`)}
    <div style="margin:16px 0;padding:12px;background:#fffbeb;border-radius:8px;">
      <p style="margin:0;font-weight:600;">Ready to pay by e-transfer</p>
      <p style="margin:8px 0 0;">Send <strong>${escapeHtml(formatCad(dueNow))}</strong> to <strong>${escapeHtml(etransferEmail)}</strong></p>
      <p style="margin:8px 0 0;">Memo: <strong>${escapeHtml(order.order_number)}</strong></p>
      ${settings?.etransfer_instructions ? `<p style="margin:8px 0 0;">${escapeHtml(settings.etransfer_instructions)}</p>` : ""}
    </div>
    ${emailButton(orderUrl, "View order & pay")}
  `;

  const text = [
    `Hi ${order.buyer_name},`,
    "Your price review is complete.",
    `Subtotal: ${formatCad(order.subtotal_cad)}`,
    Number(order.shipping_fee_cad) > 0 ? `Shipping: ${formatCad(order.shipping_fee_cad)}` : null,
    `Total: ${formatCad(order.total_cad)}`,
    `E-transfer ${formatCad(dueNow)} to ${etransferEmail}, memo: ${order.order_number}`,
    `View order: ${orderUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Your order ${order.order_number} is ready to pay`,
    html: wrapEmailHtml(`Order ${order.order_number} ready to pay`, bodyHtml),
    text,
  };
}
