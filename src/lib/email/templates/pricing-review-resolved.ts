import type { Order } from "@/types/database";
import { getEtransferAmountDueNow } from "@/lib/order-payment";
import { formatCad, getEtransferEmail } from "@/lib/utils";
import type { BuyerOrderEmailSettings } from "@/lib/email/templates/order-placed-buyer";
import {
  emailButton,
  emailCallout,
  emailOrderBadge,
  emailTotals,
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

  const totalLines: { label: string; value: string; emphasize?: boolean }[] = [
    { label: "Subtotal", value: formatCad(order.subtotal_cad) },
  ];
  if (Number(order.shipping_fee_cad) > 0) {
    totalLines.push({
      label: "Shipping",
      value: formatCad(order.shipping_fee_cad),
    });
  }
  totalLines.push({
    label: "Total",
    value: formatCad(order.total_cad),
    emphasize: true,
  });

  const bodyHtml = `
    ${emailOrderBadge(order.order_number)}
    <p style="margin:12px 0 20px;font-size:14px;color:#64748b;">Your price review is complete. Here is your updated total:</p>
    ${emailTotals(totalLines)}
    ${emailCallout(
      "payment",
      "Ready to pay by e-transfer",
      `<p style="margin:0 0 8px;">Send <strong>${escapeHtml(formatCad(dueNow))}</strong> to <strong>${escapeHtml(etransferEmail)}</strong></p>
      <p style="margin:0;">Memo: <strong>${escapeHtml(order.order_number)}</strong></p>
      ${settings?.etransfer_instructions ? `<p style="margin:12px 0 0;">${escapeHtml(settings.etransfer_instructions)}</p>` : ""}`,
    )}
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
    html: wrapEmailHtml(`Order ${order.order_number} ready to pay`, bodyHtml, {
      preheader: `Updated total ${formatCad(order.total_cad)} — ready for e-transfer.`,
      headline: "Price review complete",
      lead: `Hi ${escapeHtml(order.buyer_name)},`,
    }),
    text,
  };
}
