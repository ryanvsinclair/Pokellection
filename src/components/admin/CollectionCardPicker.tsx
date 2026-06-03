"use client";

import { useMemo, useState } from "react";
import { searchCards } from "@/lib/shop-catalog";
import type { Card } from "@/types/database";
import { formatCad } from "@/lib/utils";

interface Props {
  cards: Card[];
  selectedIds: Set<string>;
  lockedInOtherCollections: Set<string>;
  disabled?: boolean;
}

export function CollectionCardPicker({
  cards,
  selectedIds: initialSelectedIds,
  lockedInOtherCollections,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds));

  const visibleCards = useMemo(() => searchCards(cards, query), [cards, query]);

  function toggleCard(cardId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(cardId);
      else next.delete(cardId);
      return next;
    });
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Cards in this collection</legend>
      <p className="text-xs text-muted">
        Order follows your selection top to bottom. Only available singles can be added.
      </p>

      {selected.size > 0 && (
        <p className="text-xs font-medium text-primary">{selected.size} selected</p>
      )}

      <label className="block">
        <span className="sr-only">Search cards</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
          placeholder="Search by name, set, number, rarity, or printing…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 placeholder:text-muted focus:ring-2 disabled:bg-surface"
        />
      </label>

      {query.trim() && (
        <p className="text-xs text-muted">
          {visibleCards.length} of {cards.length} cards shown
        </p>
      )}

      {[...selected].map((cardId) => (
        <input key={cardId} type="hidden" name="card_ids" value={cardId} />
      ))}

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
        {cards.length === 0 ? (
          <p className="text-sm text-muted">No available cards to add.</p>
        ) : visibleCards.length === 0 ? (
          <p className="text-sm text-muted">No cards match your search.</p>
        ) : (
          visibleCards.map((card) => {
            const locked =
              lockedInOtherCollections.has(card.id) && !selected.has(card.id);
            const isChecked = selected.has(card.id);
            return (
              <label
                key={card.id}
                className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface ${
                  locked || disabled ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => toggleCard(card.id, event.target.checked)}
                  disabled={disabled || locked}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{card.title}</span>
                  <span className="block text-xs text-muted">
                    {formatCad(card.price_cad)}
                    {card.set_name ? ` · ${card.set_name}` : ""}
                    {card.card_number ? ` · #${card.card_number}` : ""}
                    {locked ? " · In another collection" : ""}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </fieldset>
  );
}
