import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupportContact } from "@/components/SupportContact";
import { formatFulfillmentOptionLabel } from "@/lib/checkout-options";
import {
  formatPaymentStatusLabel,
  getBalanceDueOnDelivery,
  getEtransferAmountDueNow,
  orderHasDeliveryDeposit,
  orderRequiresPrepayEtransfer,
} from "@/lib/order-payment";
import { formatCad, getEtransferEmail } from "@/lib/utils";
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

  const prepay = orderRequiresPrepayEtransfer(order);
  const hasDeposit = orderHasDeliveryDeposit(order);
  const dueNow = getEtransferAmountDueNow(order);
  const balanceOnDelivery = getBalanceDueOnDelivery(order);
  const showDepositInstructions = hasDeposit && dueNow > 0;
  const showFullPrepayInstructions =
    prepay && !hasDeposit && order.payment_status === "awaiting_transfer";
  const showBalanceReminder =
    hasDeposit &&
    balanceOnDelivery > 0 &&
    (order.payment_status === "deposit_received" ||
      order.payment_status === "awaiting_transfer");

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
          <span className="capitalize">
            {formatPaymentStatusLabel(order.payment_status, order.payment_method, order)}
          </span>
        </p>
        <p className="mt-1">
          <span className="text-muted">Status:</span>{" "}
          <span className="capitalize">{order.fulfillment_status.replace("_", " ")}</span>
        </p>
        <p className="mt-1">
          <span className="text-muted">Delivery:</span>{" "}
          {formatFulfillmentOptionLabel(
            order.fulfillment_option,
            order.shipping_address as { delivery_area?: string } | null,
          )}
        </p>
        <p className="mt-1">
          <span className="text-muted">Order total:</span> {formatCad(order.total_cad)}
        </p>
        {hasDeposit && (
          <>
            <p className="mt-1">
              <span className="text-muted">Deposit:</span> {formatCad(order.deposit_cad)}{" "}
              <span className="text-muted">(non-refundable)</span>
            </p>
            <p className="mt-1">
              <span className="text-muted">Balance on delivery:</span>{" "}
              {formatCad(order.balance_due_cad ?? 0)}
            </p>
          </>
        )}
      </div>

      {showDepositInstructions && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            E-transfer deposit (required)
          </p>
          <p className="mt-2 text-amber-800 dark:text-amber-300">
            Send {formatCad(dueNow)} to{" "}
            <a
              href={`mailto:${getEtransferEmail(settings)}`}
              className="font-semibold underline underline-offset-2"
            >
              {getEtransferEmail(settings)}
            </a>{" "}
            to confirm your delivery slot.
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Memo: <strong>{order.order_number}</strong>
          </p>
          <p className="mt-2 text-amber-800 dark:text-amber-300">
            This deposit is non-refundable if you cancel or do not accept delivery. The remaining{" "}
            {formatCad(balanceOnDelivery)} is due when your order is delivered (cash or
            e-transfer).
          </p>
          {settings?.etransfer_instructions && (
            <p className="mt-2 text-amber-800 dark:text-amber-300">{settings.etransfer_instructions}</p>
          )}
        </div>
      )}

      {showFullPrepayInstructions && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">E-transfer instructions</p>
          <p className="mt-2 text-amber-800 dark:text-amber-300">
            Send {formatCad(order.total_cad)} to{" "}
            <a
              href={`mailto:${getEtransferEmail(settings)}`}
              className="font-semibold underline underline-offset-2"
            >
              {getEtransferEmail(settings)}
            </a>
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Memo: <strong>{order.order_number}</strong>
          </p>
          {settings?.etransfer_instructions && (
            <p className="mt-2 text-amber-800 dark:text-amber-300">{settings.etransfer_instructions}</p>
          )}
        </div>
      )}

      {showBalanceReminder &&
        order.payment_status === "deposit_received" &&
        balanceOnDelivery > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-900/60 dark:bg-sky-950/40">
            <p className="font-semibold text-sky-900 dark:text-sky-200">Balance on delivery</p>
            <p className="mt-2 text-sky-800 dark:text-sky-300">
              Deposit received. Please have {formatCad(balanceOnDelivery)} ready at delivery (cash
              or e-transfer to {getEtransferEmail(settings)}).
            </p>
          </div>
        )}

      {!prepay && order.payment_status === "awaiting_transfer" && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-900/60 dark:bg-sky-950/40">
          <p className="font-semibold text-sky-900 dark:text-sky-200">Pay when you pick up</p>
          <p className="mt-2 text-sky-800 dark:text-sky-300">
            No e-transfer is needed before you arrive. Bring {formatCad(order.total_cad)} in cash or
            send an e-transfer at pickup to{" "}
            <a
              href={`mailto:${getEtransferEmail(settings)}`}
              className="font-semibold underline underline-offset-2"
            >
              {getEtransferEmail(settings)}
            </a>
            .
          </p>
          <p className="mt-1 text-sky-800 dark:text-sky-300">
            Memo: <strong>{order.order_number}</strong>
          </p>
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
        order.fulfillment_option === "canada_ship" && (
          <p className="text-sm text-muted">
            Tracking will appear here once your order ships.
          </p>
        )
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Questions about this order?</p>
        <SupportContact orderNumber={order.order_number} className="mt-2" />
      </div>

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
