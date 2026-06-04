import type { Metadata } from "next";
import Link from "next/link";
import { CardGrid } from "@/components/CardGrid";
import { JsonLd } from "@/components/JsonLd";
import { getCartQuantitiesByCardId } from "@/lib/queries/cart";
import { getJustSoldCards, getLatestArrivals, LATEST_ARRIVAL_TIERS } from "@/lib/queries/cards";
import { canPurchaseAsBuyer } from "@/lib/auth-roles";
import { buildOrganizationJsonLd, buildPageMetadata, buildWebSiteJsonLd } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { LOCATION, SITE_DESCRIPTION } from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: `Pokémon cards in ${LOCATION}`,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [cards, justSoldCards] = await Promise.all([
    getLatestArrivals(supabase),
    getJustSoldCards(supabase, 72, 8),
  ]);
  const availableIds = new Set(cards.map((c) => c.id));
  const justSoldForHome = justSoldCards.filter((c) => !availableIds.has(c.id));
  const homeGridCards = [...justSoldForHome, ...cards];

  const canPurchase = await canPurchaseAsBuyer(supabase, user?.id);
  const cartQtyByCardId = user
    ? await getCartQuantitiesByCardId(supabase, user.id)
    : {};

  return (
    <div className="space-y-10">
      <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
      <section className="rounded-2xl bg-gradient-to-br from-red-600 to-red-800 px-6 py-10 text-white shadow-lg">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-red-100">
          {LOCATION}
        </p>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
          Independent Pokémon singles &amp; collections in Ottawa
        </h1>
        <p className="mt-4 max-w-lg text-red-50">
          Reserve for pickup, pay by e-transfer, or ship anywhere in Canada.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-red-700"
          >
            Shop all cards
          </Link>
          <Link
            href="/shop?pickup=true"
            className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Same-day pickup
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Latest arrivals</h2>
            <p className="text-sm text-muted">
              A mix of new listings ({LATEST_ARRIVAL_TIERS.map((t) => t.label).join(", ")})
            </p>
          </div>
          <Link href="/shop" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>
        <CardGrid
          cards={homeGridCards}
          cartQtyByCardId={cartQtyByCardId}
          canPurchase={canPurchase}
          emptyMessage="No new listings in these price ranges right now."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Local pickup</h3>
          <p className="mt-2 text-sm text-muted">
            Reserve a card online and pick it up the same day in Ottawa. Pay
            with cash or e-transfer at pickup.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Shipped orders</h3>
          <p className="mt-2 text-sm text-muted">
            Pay by e-transfer and choose untracked or tracked shipping for a
            small extra fee.
          </p>
        </div>
      </section>
    </div>
  );
}
