import Link from "next/link";
import { redirect } from "next/navigation";
import { placeOrder, removeFromCart, updateCartQuantity } from "@/app/cart/actions";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

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

  const [{ data: cartRows }, { data: profile }, { data: settings }] = await Promise.all([
    supabase.from("cart_items").select("id, quantity, card_id").eq("user_id", user.id),
    supabase.from("profiles").select("display_name, phone").eq("id", user.id).single(),
    supabase.from("site_settings").select("*").eq("id", 1).single(),
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
    .filter(Boolean) as { row: { id: string; quantity: number }; card: { id: string; title: string; price_cad: number; status: string } }[];

  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.card.price_cad) * line.row.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cart & checkout</h1>
        <p className="mt-1 text-sm text-muted">
          Pay by e-transfer after placing your order. Shipping anywhere in Canada.
        </p>
      </div>

      {error === "unavailable" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Some items in your cart are no longer available. Remove them to continue.
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
                    {formatCad(card.price_cad)} · {card.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateCartQuantity} className="flex items-center gap-1">
                    <input type="hidden" name="cart_item_id" value={row.id} />
                    <input
                      type="number"
                      name="quantity"
                      min={1}
                      defaultValue={row.quantity}
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

          <p className="text-lg font-semibold">Subtotal: {formatCad(subtotal)}</p>

          <form action={placeOrder} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Shipping details</h2>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Full name</span>
              <input
                name="buyer_name"
                required
                defaultValue={profile?.display_name ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Phone</span>
              <input
                name="buyer_phone"
                required
                defaultValue={profile?.phone ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Street address</span>
              <input name="street" required className="w-full rounded-lg border border-border px-3 py-2" />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">City</span>
                <input name="city" required className="w-full rounded-lg border border-border px-3 py-2" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Province</span>
                <input
                  name="province"
                  defaultValue="ON"
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Postal code</span>
              <input name="postal_code" required className="w-full rounded-lg border border-border px-3 py-2" />
            </label>

            <fieldset className="space-y-2 text-sm">
              <legend className="font-medium">Shipping method</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="shipping_method" value="untracked" defaultChecked />
                Untracked — {formatCad(Number(settings?.untracked_shipping_fee_cad ?? 3))}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="shipping_method" value="tracked" />
                Tracked — {formatCad(Number(settings?.tracked_shipping_fee_cad ?? 15))}
              </label>
            </fieldset>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white"
            >
              Place order (e-transfer)
            </button>
          </form>
        </>
      )}
    </div>
  );
}
