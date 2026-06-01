import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";
import { getTrackingUrl } from "@/lib/tracking";

interface Props {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderNumber } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/account/login?redirect=/account/orders/${orderNumber}`);

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("buyer_id", user.id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/account/orders" className="text-sm text-muted">
        ← Back to orders
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{order.order_number}</h1>
        <p className="mt-1 text-sm text-muted">
          Placed {new Date(order.created_at).toLocaleString("en-CA")}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p>
          <span className="text-muted">Payment:</span>{" "}
          <span className="capitalize">{order.payment_status.replace("_", " ")}</span>
        </p>
        <p className="mt-1">
          <span className="text-muted">Fulfillment:</span>{" "}
          <span className="capitalize">{order.fulfillment_status.replace("_", " ")}</span>
        </p>
        <p className="mt-1">
          <span className="text-muted">Total:</span> {formatCad(order.total_cad)}
        </p>
      </div>

      {order.payment_status === "awaiting_transfer" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">E-transfer instructions</p>
          <p className="mt-2 text-amber-800 dark:text-amber-300">
            Send {formatCad(order.total_cad)} to{" "}
            <strong>{settings?.etransfer_email || "see email confirmation"}</strong>
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Memo: <strong>{order.order_number}</strong>
          </p>
          {settings?.etransfer_instructions && (
            <p className="mt-2 text-amber-800 dark:text-amber-300">{settings.etransfer_instructions}</p>
          )}
        </div>
      )}

      {order.tracking_number ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">Shipping tracking</p>
          <p className="mt-1 font-mono text-emerald-800 dark:text-emerald-300">{order.tracking_number}</p>
          <a
            href={getTrackingUrl(order.tracking_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            Track package on Canada Post
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Tracking will appear here once your order ships.
        </p>
      )}

      <ul className="space-y-2 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Items</p>
        {(items ?? []).map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>
              {item.title_snapshot} × {item.quantity}
            </span>
            <span>{formatCad(item.price_snapshot * item.quantity)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
