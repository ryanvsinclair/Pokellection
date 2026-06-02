import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrdersForBuyer } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";
import { SupportContact } from "@/components/SupportContact";
import { formatCad } from "@/lib/utils";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/account/orders");

  const orders = await getOrdersForBuyer(supabase, user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My orders</h1>
        <p className="mt-1 text-sm text-muted">Track payment, shipping, and delivery status.</p>
        <SupportContact className="mt-3" />
      </div>

      <ul className="space-y-3">
        {(orders ?? []).map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.order_number}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-surface"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{order.order_number}</p>
                <p className="text-sm font-medium">{formatCad(order.total_cad)}</p>
              </div>
              <p className="mt-1 text-sm capitalize text-muted">
                {order.payment_status.replace("_", " ")} · {order.fulfillment_status.replace("_", " ")}
              </p>
              {order.tracking_number && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Tracking added</p>
              )}
            </Link>
          </li>
        ))}
        {(orders ?? []).length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No orders yet.
          </li>
        )}
      </ul>
    </div>
  );
}
