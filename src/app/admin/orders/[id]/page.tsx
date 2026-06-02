import Link from "next/link";
import { notFound } from "next/navigation";
import { updateOrder } from "@/app/admin/orders/actions";
import { createClient } from "@/lib/supabase/server";
import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
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
        <p className="mt-1 text-sm text-muted">
          {formatFulfillmentOptionLabel(
            order.fulfillment_option,
            order.shipping_address as { delivery_area?: string } | null,
          )}
          {order.shipping_fee_cad > 0 && ` · Fee ${formatCad(order.shipping_fee_cad)}`}
        </p>
      </div>

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
            <option value="awaiting_transfer">Awaiting transfer</option>
            <option value="received">Received</option>
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
