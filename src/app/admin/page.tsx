import { createClient } from "@/lib/supabase/server";
import { getPublishedCollectionTitlesByCardId } from "@/lib/queries/collections";
import { getPendingReservationCardIds } from "@/lib/queries/reservations";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [cards, pendingReservationCardIds, collectionTitlesByCardId, orders] =
    await Promise.all([
      supabase.from("cards").select("status"),
      getPendingReservationCardIds(supabase),
      getPublishedCollectionTitlesByCardId(supabase),
      supabase
        .from("orders")
        .select("payment_status, payment_method")
        .eq("payment_status", "awaiting_transfer")
        .eq("payment_method", "etransfer"),
    ]);

  const available = cards.data?.filter((c) => c.status === "available").length ?? 0;
  const inCollections = collectionTitlesByCardId.size;
  const pickupHolds = pendingReservationCardIds.size;
  const awaitingPayment = orders.data?.length ?? 0;

  const stats = [
    { label: "Available cards", value: available },
    { label: "In collections", value: inCollections },
    { label: "Pickup holds", value: pickupHolds },
    { label: "Awaiting e-transfer", value: awaitingPayment },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <span className="font-medium text-foreground">In collections</span> — cards in a
        published bundle (hidden from singles shop).{" "}
        <span className="font-medium text-foreground">Pickup holds</span> — same-day reserve
        requests from buyers.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
