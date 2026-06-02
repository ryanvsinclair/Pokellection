import Link from "next/link";
import { CardGrid } from "@/components/CardGrid";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseFetchError } from "@/lib/supabase/env";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: cards, error } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    logSupabaseFetchError("HomePage cards", error);
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-red-600 to-red-800 px-6 py-10 text-white shadow-lg">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-red-100">
          Ottawa, Ontario
        </p>
        <h1 className="max-w-xl text-3xl font-bold leading-tight md:text-5xl">
          Your local Pokemon card shop
        </h1>
        <p className="mt-4 max-w-lg text-red-50">
          Browse singles, reserve for same-day pickup, or pay by e-transfer and
          get tracked shipping anywhere in Canada.
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
          <h2 className="text-xl font-bold">Latest arrivals</h2>
          <Link href="/shop" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>
        <CardGrid cards={cards ?? []} emptyMessage="No cards listed yet. Check back soon!" />
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
