"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/types/database";
import { CardGrid } from "@/components/CardGrid";
import {
  applyShopCatalog,
  CARD_CONDITIONS,
  DEFAULT_SHOP_FILTERS,
  DEFAULT_SHOP_SORT,
  getShopFilterOptions,
  type ShopFilters,
  type ShopSort,
} from "@/lib/shop-catalog";
import { formatCondition } from "@/lib/utils";

interface Props {
  cards: Card[];
}

const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "price-desc", label: "Price: high → low" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "name-asc", label: "Name: A → Z" },
  { value: "name-desc", label: "Name: Z → A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

function pillClass(active: boolean) {
  return active
    ? "border-primary bg-primary text-primary-foreground"
    : "border-border bg-card text-foreground hover:bg-surface";
}

export function ShopBrowser({ cards }: Props) {
  const [filters, setFilters] = useState<ShopFilters>(DEFAULT_SHOP_FILTERS);
  const [sort, setSort] = useState<ShopSort>(DEFAULT_SHOP_SORT);

  const { sets, printings } = useMemo(() => getShopFilterOptions(cards), [cards]);
  const visibleCards = useMemo(
    () => applyShopCatalog(cards, filters, sort),
    [cards, filters, sort],
  );

  const hasActiveFilters =
    filters.query.trim() !== "" ||
    filters.condition !== "all" ||
    filters.setName !== "" ||
    filters.printing !== "";

  function updateFilters(patch: Partial<ShopFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(DEFAULT_SHOP_FILTERS);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <label className="block">
          <span className="sr-only">Search cards</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder="Search by name, set, number, rarity, or printing…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 placeholder:text-muted focus:ring-2"
          />
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sort</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${pillClass(sort === option.value)}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Condition</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateFilters({ condition: "all" })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${pillClass(filters.condition === "all")}`}
            >
              All
            </button>
            {CARD_CONDITIONS.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => updateFilters({ condition })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${pillClass(filters.condition === condition)}`}
              >
                {formatCondition(condition)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Set</span>
            <select
              value={filters.setName}
              onChange={(event) => updateFilters({ setName: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            >
              <option value="">All sets</option>
              {sets.map((setName) => (
                <option key={setName} value={setName}>
                  {setName}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Printing
            </span>
            <select
              value={filters.printing}
              onChange={(event) => updateFilters({ printing: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            >
              <option value="">All printings</option>
              {printings.map((printing) => (
                <option key={printing} value={printing}>
                  {printing}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">
            Showing {visibleCards.length} of {cards.length} cards
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <CardGrid
        cards={visibleCards}
        emptyMessage={
          hasActiveFilters
            ? "No cards match your search or filters."
            : "No cards available right now."
        }
      />
    </div>
  );
}
