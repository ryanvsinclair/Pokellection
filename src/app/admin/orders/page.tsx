import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Buyer</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium">Tracking</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((order) => (
            <tr key={order.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{order.order_number}</td>
              <td className="px-4 py-3">{order.buyer_name}</td>
              <td className="px-4 py-3">{formatCad(order.total_cad)}</td>
              <td className="px-4 py-3 capitalize">{order.payment_status.replace("_", " ")}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {order.tracking_number ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-primary">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
          {(orders ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
