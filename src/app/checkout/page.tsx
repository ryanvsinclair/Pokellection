import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { removeFromCart, updateCartQuantity } from "@/app/cart/actions";
import { getCheckoutOptionAvailability } from "@/lib/checkout-options";
import { createClient } from "@/lib/supabase/server";
import { collectionSinglePriceCad } from "@/lib/collection-pricing";
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
  collection_conflict:
    "Remove collection singles or the full bundle — you cannot checkout both for the same collection.",
  collection_single_qty: "Cards bought from a collection are limited to one per line.",
};

type CartLine =
  | {
      kind: "card";
      row: { id: string; quantity: number };
      card: {
        id: string;
        title: string;
        price_cad: number;
        status: string;
        quantity: number;
      };
      unitPrice: number;
      fromCollection: boolean;
    }
  | {
      kind: "collection";
      row: { id: string; quantity: number };
      collection: { id: string; title: string; price_cad: number; status: string };
      cardCount: number;
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
    supabase
      .from("cart_items")
      .select("id, quantity, card_id, collection_id, from_collection_id")
      .eq("user_id", user.id),
    supabase.from("profiles").select("display_name, phone").eq("id", user.id).single(),
  ]);

  const cardIds = (cartRows ?? [])
    .map((row) => row.card_id)
    .filter(Boolean) as string[];
  const collectionIds = (cartRows ?? [])
    .map((row) => row.collection_id)
    .filter(Boolean) as string[];

  const [{ data: cards }, { data: collections }] = await Promise.all([
    cardIds.length
      ? supabase.from("cards").select("*").in("id", cardIds)
      : Promise.resolve({ data: [] }),
    collectionIds.length
      ? supabase.from("collections").select("*").in("id", collectionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const cardMap = new Map((cards ?? []).map((card) => [card.id, card]));
  const collectionMap = new Map((collections ?? []).map((c) => [c.id, c]));

  const collectionCounts = await Promise.all(
    collectionIds.map(async (id) => {
      const { count } = await supabase
        .from("collection_cards")
        .select("card_id", { count: "exact", head: true })
        .eq("collection_id", id);
      return { id, count: count ?? 0 };
    }),
  );
  const countByCollection = Object.fromEntries(
    collectionCounts.map((row) => [row.id, row.count]),
  );

  const lines: CartLine[] = (cartRows ?? [])
    .map((row) => {
      if (row.collection_id) {
        const collection = collectionMap.get(row.collection_id);
        if (!collection) return null;
        return {
          kind: "collection" as const,
          row: { id: row.id, quantity: row.quantity },
          collection,
          cardCount: countByCollection[collection.id] ?? 0,
        };
      }
      if (row.card_id) {
        const card = cardMap.get(row.card_id);
        if (!card) return null;
        const fromCollection = Boolean(row.from_collection_id);
        return {
          kind: "card" as const,
          row: { id: row.id, quantity: row.quantity },
          card,
          fromCollection,
          unitPrice: fromCollection
            ? collectionSinglePriceCad(card.price_cad)
            : Number(card.price_cad),
        };
      }
      return null;
    })
    .filter(Boolean) as CartLine[];

  const subtotal = lines.reduce((sum, line) => {
    if (line.kind === "card") {
      return sum + line.unitPrice * line.row.quantity;
    }
    return sum + Number(line.collection.price_cad);
  }, 0);

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
            {lines.map((line) =>
              line.kind === "collection" ? (
                <li
                  key={line.row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="text-xs font-medium uppercase text-primary">Collection</p>
                    <p className="font-medium">{line.collection.title}</p>
                    <p className="text-sm text-muted">
                      {formatCad(line.collection.price_cad)} · {line.cardCount} cards ·{" "}
                      {line.collection.status}
                    </p>
                  </div>
                  <form action={removeFromCart}>
                    <input type="hidden" name="cart_item_id" value={line.row.id} />
                    <button type="submit" className="text-xs font-medium text-primary">
                      Remove
                    </button>
                  </form>
                </li>
              ) : (
                <li
                  key={line.row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    {line.fromCollection && (
                      <p className="text-xs font-medium uppercase text-primary">
                        From collection (+$5)
                      </p>
                    )}
                    <p className="font-medium">{line.card.title}</p>
                    <p className="text-sm text-muted">
                      {formatCad(line.unitPrice)}
                      {line.fromCollection
                        ? ` · ${line.card.status}`
                        : ` · ${line.card.status} · ${line.card.quantity} in stock`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!line.fromCollection && (
                      <form action={updateCartQuantity} className="flex items-center gap-1">
                        <input type="hidden" name="cart_item_id" value={line.row.id} />
                        <input
                          type="number"
                          name="quantity"
                          min={1}
                          max={line.card.quantity}
                          defaultValue={Math.min(line.row.quantity, line.card.quantity)}
                          className="w-16 rounded border border-border px-2 py-1 text-sm"
                        />
                        <button type="submit" className="text-xs font-medium text-muted">
                          Update
                        </button>
                      </form>
                    )}
                    <form action={removeFromCart}>
                      <input type="hidden" name="cart_item_id" value={line.row.id} />
                      <button type="submit" className="text-xs font-medium text-primary">
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ),
            )}
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
