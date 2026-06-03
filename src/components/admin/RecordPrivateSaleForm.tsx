"use client";

import { useRef } from "react";
import { recordPrivateSale } from "@/app/admin/sales/actions";
import { formatCad } from "@/lib/utils";

interface CardOption {
  id: string;
  title: string;
  price_cad: number;
  quantity: number;
  status: string;
}

interface Props {
  cards: CardOption[];
}

export function RecordPrivateSaleForm({ cards }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await recordPrivateSale(formData);
        formRef.current?.reset();
      }}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold">Record private sale</h3>
      <p className="text-xs text-muted">
        Marks the card sold and adds it to sales history. Remove it from Collectr before
        the next sync, or sync will list it again when it still shows as owned.
      </p>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Card</span>
        <select
          name="card_id"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        >
          <option value="">Select a card…</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.title} · {formatCad(card.price_cad)} · {card.status} · qty{" "}
              {card.quantity}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Sale price (CAD)</span>
          <input
            name="price_cad"
            type="number"
            step="0.01"
            min="0"
            placeholder="Defaults to list price"
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Quantity sold</span>
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Buyer (optional)</span>
        <input
          name="buyer_name"
          placeholder="Name or handle"
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Note (optional)</span>
        <input
          name="note"
          placeholder="Facebook Marketplace, trade night, etc."
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Record sale
      </button>
    </form>
  );
}
