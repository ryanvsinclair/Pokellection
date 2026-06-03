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
  justSoldCards?: Card[];
  cartQtyByCardId?: Record<string, number>;
  canPurchase?: boolean;
}

const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "price-desc", label: "Price: high → low" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "name-asc", label: "Name: A → Z" },
  { value: "name-desc", label: "Name: Z → A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 placeholder:text-muted focus:ring-2";

const selectClassName =
  "rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2";

const labelClassName = "text-xs font-semibold uppercase tracking-wide text-muted";

export function ShopBrowser({
  cards,
  justSoldCards = [],
  cartQtyByCardId = {},
  canPurchase = true,
}: Props) {
  const [filters, setFilters] = useState<ShopFilters>(DEFAULT_SHOP_FILTERS);
  const [sort, setSort] = useState<ShopSort>(DEFAULT_SHOP_SORT);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const listingCards = useMemo(() => {
    const availableIds = new Set(cards.map((c) => c.id));
    const soldOnly = justSoldCards.filter((c) => !availableIds.has(c.id));
    return [...soldOnly, ...cards];
  }, [cards, justSoldCards]);

  const { sets, printings } = useMemo(() => getShopFilterOptions(cards), [cards]);
  const visibleCards = useMemo(() => {
    const availableIds = new Set(cards.map((c) => c.id));
    const soldOnly = justSoldCards.filter((c) => !availableIds.has(c.id));
    const filteredAvailable = applyShopCatalog(cards, filters, sort);
    return [...soldOnly, ...filteredAvailable];
  }, [cards, justSoldCards, filters, sort]);

  const hasAdvancedFilters =
    filters.condition !== "all" || filters.setName !== "" || filters.printing !== "";

  const hasActiveFilters =
    filters.query.trim() !== "" || hasAdvancedFilters;

  function updateFilters(patch: Partial<ShopFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(DEFAULT_SHOP_FILTERS);
  }

  function clearAdvancedFilters() {
    setFilters((current) => ({
      ...current,
      condition: "all",
      setName: "",
      printing: "",
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Search cards</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder="Search by name, set, number, rarity, or printing…"
            className={`${inputClassName} w-full`}
          />
        </label>

        <label className="block shrink-0 sm:w-52">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as ShopSort)}
            className={`${selectClassName} w-full`}
            aria-label="Sort cards"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
            aria-controls="shop-advanced-filters"
            className={`flex h-full w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
              advancedOpen || hasAdvancedFilters
                ? "border-primary/50 bg-surface text-foreground"
                : "border-border bg-background text-foreground hover:bg-surface"
            }`}
          >
            <span className="hidden sm:inline">Advanced </span>filters
            {hasAdvancedFilters && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                On
              </span>
            )}
          </button>

          {advancedOpen && (
            <>
              <button
                type="button"
                aria-label="Close filters"
                className="fixed inset-0 z-10 cursor-default bg-black/20 sm:bg-transparent"
                onClick={() => setAdvancedOpen(false)}
              />
              <div
                id="shop-advanced-filters"
                className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-border bg-card p-4 shadow-lg sm:w-72"
              >
                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className={labelClassName}>Condition</span>
                    <select
                      value={filters.condition}
                      onChange={(event) =>
                        updateFilters({
                          condition: event.target.value as ShopFilters["condition"],
                        })
                      }
                      className={`${selectClassName} w-full`}
                    >
                      <option value="all">All conditions</option>
                      {CARD_CONDITIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {formatCondition(condition)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className={labelClassName}>Set</span>
                    <select
                      value={filters.setName}
                      onChange={(event) => updateFilters({ setName: event.target.value })}
                      className={`${selectClassName} w-full`}
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
                    <span className={labelClassName}>Printing</span>
                    <select
                      value={filters.printing}
                      onChange={(event) => updateFilters({ printing: event.target.value })}
                      className={`${selectClassName} w-full`}
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

                {hasAdvancedFilters && (
                  <button
                    type="button"
                    onClick={clearAdvancedFilters}
                    className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Clear advanced filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          Showing {visibleCards.length} of {listingCards.length} cards
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <CardGrid
        cards={visibleCards}
        cartQtyByCardId={cartQtyByCardId}
        canPurchase={canPurchase}
        emptyMessage={
          hasActiveFilters
            ? "No cards match your search or filters."
            : "No cards available right now."
        }
      />
    </div>
  );
}
