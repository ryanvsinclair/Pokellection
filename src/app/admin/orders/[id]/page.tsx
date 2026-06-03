import Link from "next/link";
import { notFound } from "next/navigation";
import { updateOrder } from "@/app/admin/orders/actions";
import { createClient } from "@/lib/supabase/server";
import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
import {
  formatPaymentStatusLabel,
  getBalanceDueOnDelivery,
  orderHasDeliveryDeposit,
} from "@/lib/order-payment";
import { orderHasOpenPricingReview } from "@/lib/order-pricing-review";
import { formatCad } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) notFound();

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
  const pricingReviewOpen = orderHasOpenPricingReview(order);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/orders" className="text-sm text-muted">
        ← Back to orders
      </Link>

      <div>
        <h2 className="text-lg font-semibold">{order.order_number}</h2>
        <p className="text-sm text-muted">
          {order.buyer_name} · {order.buyer_email} · {order.buyer_phone}
        </p>
        <p className="mt-1 text-sm font-medium">{formatCad(order.total_cad)}</p>
        <p className="mt-1 text-sm text-muted capitalize">
          Payment: {formatPaymentStatusLabel(order.payment_status, order.payment_method, order)} (
          {order.payment_method.replace(/_/g, " ")})
        </p>
        {orderHasDeliveryDeposit(order) && (
          <p className="mt-1 text-sm text-muted">
            Deposit {formatCad(order.deposit_cad)} (non-refundable) · Balance on delivery{" "}
            {formatCad(getBalanceDueOnDelivery(order))}
          </p>
        )}
        <p className="mt-1 text-sm text-muted">
          {formatFulfillmentOptionLabel(
            order.fulfillment_option,
            order.shipping_address as { delivery_area?: string } | null,
          )}
          {order.shipping_fee_cad > 0 && ` · Fee ${formatCad(order.shipping_fee_cad)}`}
        </p>
      </div>

      {pricingReviewOpen && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900/60 dark:bg-violet-950/40">
          <p className="font-semibold text-violet-900 dark:text-violet-200">
            Buyer requested price review
          </p>
          <p className="mt-1 text-violet-800 dark:text-violet-300">
            Adjust subtotal below, then check &quot;Ready for buyer to pay&quot; so e-transfer
            instructions appear on their order page.
          </p>
          {order.pricing_review_message && (
            <p className="mt-2 text-violet-800 dark:text-violet-300">
              <span className="font-medium">Message:</span> {order.pricing_review_message}
            </p>
          )}
        </div>
      )}

      <ul className="rounded-xl border border-border bg-card p-4 text-sm">
        {(items ?? []).map((item) => (
          <li key={item.id} className="border-b border-border py-2 last:border-none">
            {item.title_snapshot} × {item.quantity} — {formatCad(item.price_snapshot)}
          </li>
        ))}
      </ul>

      <form action={updateOrder} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <input type="hidden" name="order_id" value={order.id} />

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Subtotal (CAD)</span>
          <input
            name="subtotal_cad"
            type="number"
            step="0.01"
            min={0}
            required
            defaultValue={order.subtotal_cad}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
          <span className="text-xs text-muted">
            Order total updates to subtotal + shipping fee ({formatCad(order.shipping_fee_cad)}).
          </span>
        </label>

        {pricingReviewOpen && (
          <label className="flex cursor-pointer gap-3 text-sm">
            <input
              type="checkbox"
              name="resolve_pricing_review"
              value="1"
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Ready for buyer to pay</span>
              <span className="mt-0.5 block text-muted">
                Clears the price review hold and shows e-transfer instructions with the total above.
              </span>
            </span>
          </label>
        )}

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tracking number</span>
          <input
            name="tracking_number"
            defaultValue={order.tracking_number ?? ""}
            placeholder="e.g. 1234567890123456"
            className="w-full rounded-lg border border-border px-3 py-2"
          />
          <span className="text-xs text-muted">
            Buyers will see this on their order page with a Canada Post tracking link.
          </span>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Payment status</span>
          <select
            name="payment_status"
            defaultValue={order.payment_status}
            className="w-full rounded-lg border border-border px-3 py-2"
          >
            <option value="awaiting_transfer">Awaiting transfer / deposit</option>
            <option value="deposit_received">Deposit received (balance on delivery)</option>
            <option value="received">Paid in full</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Fulfillment status</span>
          <select
            name="fulfillment_status"
            defaultValue={order.fulfillment_status}
            className="w-full rounded-lg border border-border px-3 py-2"
          >
            <option value="pending">Pending</option>
            <option value="ready_for_pickup">Ready for pickup</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          Save order updates
        </button>
      </form>
    </div>
  );
}
