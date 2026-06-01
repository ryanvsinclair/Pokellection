import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [cards, reservations, orders] = await Promise.all([
    supabase.from("cards").select("status"),
    supabase.from("reservations").select("status").eq("status", "pending"),
    supabase.from("orders").select("payment_status").eq("payment_status", "awaiting_transfer"),
  ]);

  const available = cards.data?.filter((c) => c.status === "available").length ?? 0;
  const reserved = cards.data?.filter((c) => c.status === "reserved").length ?? 0;
  const pendingReservations = reservations.data?.length ?? 0;
  const awaitingPayment = orders.data?.length ?? 0;

  const stats = [
    { label: "Available cards", value: available },
    { label: "Reserved cards", value: reserved },
    { label: "Pending reservations", value: pendingReservations },
    { label: "Awaiting e-transfer", value: awaitingPayment },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">{stat.label}</p>
          <p className="mt-1 text-3xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
