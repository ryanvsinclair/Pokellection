import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { removeFromCart, updateCartQuantity } from "@/app/cart/actions";
import { getCheckoutOptionAvailability } from "@/lib/checkout-options";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

const CHECKOUT_ERRORS: Record<string, string> = {
  unavailable:
    "Some items in your cart are no longer available. Remove them to continue.",
  max_quantity: "Quantity was limited to what we have in stock.",
  invalid_option: "Please choose a valid fulfillment option.",
  missing_delivery_area: "Please select a delivery area.",
  missing_address: "A full address is required for this option.",
  option_unavailable: "That fulfillment option is not available right now.",
  next_day_pickup_closed:
    "Next-day pickup orders must be placed before 10:30 PM (Ottawa time).",
  next_day_delivery_closed:
    "Next-day delivery orders must be placed before 11:00 PM (Ottawa time).",
  same_day_pickup_unavailable:
    "Same-day pickup is only available after 5:00 PM (Ottawa time).",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/checkout");
  }

  const [{ data: cartRows }, { data: profile }] = await Promise.all([
    supabase.from("cart_items").select("id, quantity, card_id").eq("user_id", user.id),
    supabase.from("profiles").select("display_name, phone").eq("id", user.id).single(),
  ]);

  const cardIds = (cartRows ?? []).map((row) => row.card_id);
  const { data: cards } = cardIds.length
    ? await supabase.from("cards").select("*").in("id", cardIds)
    : { data: [] };

  const cardMap = new Map((cards ?? []).map((card) => [card.id, card]));
  const lines = (cartRows ?? [])
    .map((row) => {
      const card = cardMap.get(row.card_id);
      if (!card) return null;
      return { row, card };
    })
    .filter(Boolean) as {
    row: { id: string; quantity: number };
    card: { id: string; title: string; price_cad: number; status: string; quantity: number };
  }[];

  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.card.price_cad) * line.row.quantity,
    0,
  );

  const availability = getCheckoutOptionAvailability();

  const errorMessage = error ? CHECKOUT_ERRORS[error] : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cart & checkout</h1>
        <p className="mt-1 text-sm text-muted">
          Ottawa pickup and delivery, or shipping anywhere in Canada. Pay by e-transfer after
          placing your order.
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {errorMessage}
        </p>
      )}

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">Your cart is empty.</p>
          <Link href="/shop" className="mt-3 inline-block text-sm font-semibold text-primary">
            Browse cards
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {lines.map(({ row, card }) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium">{card.title}</p>
                  <p className="text-sm text-muted">
                    {formatCad(card.price_cad)} · {card.status} · {card.quantity} in stock
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateCartQuantity} className="flex items-center gap-1">
                    <input type="hidden" name="cart_item_id" value={row.id} />
                    <input
                      type="number"
                      name="quantity"
                      min={1}
                      max={card.quantity}
                      defaultValue={Math.min(row.quantity, card.quantity)}
                      className="w-16 rounded border border-border px-2 py-1 text-sm"
                    />
                    <button type="submit" className="text-xs font-medium text-muted">
                      Update
                    </button>
                  </form>
                  <form action={removeFromCart}>
                    <input type="hidden" name="cart_item_id" value={row.id} />
                    <button type="submit" className="text-xs font-medium text-primary">
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <CheckoutForm
            subtotalCad={subtotal}
            defaultName={profile?.display_name ?? ""}
            defaultPhone={profile?.phone ?? ""}
            availability={availability}
          />
        </>
      )}
    </div>
  );
}
