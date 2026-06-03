"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteCard, setCardStatus } from "@/app/admin/cards/actions";
import { searchCards } from "@/lib/shop-catalog";
import type { Card } from "@/types/database";
import { formatCad } from "@/lib/utils";

interface Props {
  cards: Card[];
}

export function AdminCardsTable({ cards }: Props) {
  const [query, setQuery] = useState("");

  const visibleCards = useMemo(() => searchCards(cards, query), [cards, query]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Search cards</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, set, number, rarity, or printing…"
          className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 placeholder:text-muted focus:ring-2"
        />
      </label>

      {query.trim() && (
        <p className="text-sm text-muted">
          {visibleCards.length} of {cards.length} cards
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCards.map((card) => (
              <tr key={card.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{card.title}</td>
                <td className="px-4 py-3 text-muted">{card.set_name ?? "—"}</td>
                <td className="px-4 py-3">{formatCad(card.price_cad)}</td>
                <td className="px-4 py-3 capitalize">{card.status}</td>
                <td className="px-4 py-3">{card.quantity}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/cards/${card.id}/edit`}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium"
                    >
                      Edit
                    </Link>
                    {card.status !== "sold" && (
                      <Link
                        href="/admin/sales"
                        className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                      >
                        Record sale
                      </Link>
                    )}
                    {card.status !== "draft" && (
                      <form action={setCardStatus}>
                        <input type="hidden" name="card_id" value={card.id} />
                        <input type="hidden" name="status" value="draft" />
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2 py-1 text-xs font-medium"
                        >
                          Unlist
                        </button>
                      </form>
                    )}
                    <form action={deleteCard}>
                      <input type="hidden" name="card_id" value={card.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {visibleCards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {cards.length === 0
                    ? "No cards yet. Add your first card or import a CSV."
                    : "No cards match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
