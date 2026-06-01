"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReservePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    const { error: reservationError } = await supabase.from("reservations").insert({
      card_id: id,
      buyer_name: String(form.get("buyer_name")),
      buyer_email: String(form.get("buyer_email")),
      buyer_phone: String(form.get("buyer_phone")),
      status: "pending",
      reserved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      notes: String(form.get("notes") || "") || null,
    });

    if (reservationError) {
      setError(reservationError.message);
      setLoading(false);
      return;
    }

    router.push("/shop");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reserve for pickup</h1>
        <p className="mt-1 text-sm text-muted">
          Same-day pickup in Ottawa. Your card is held until end of day.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input name="buyer_name" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input name="buyer_email" type="email" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Phone</span>
          <input name="buyer_phone" type="tel" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Notes (optional)</span>
          <textarea name="notes" rows={2} className="w-full rounded-lg border border-border px-3 py-2" />
        </label>

        {error && <p className="text-sm text-primary">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Reserving…" : "Reserve card"}
        </button>
      </form>
    </div>
  );
}
