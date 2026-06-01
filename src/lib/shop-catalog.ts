import type { Card, CardCondition } from "@/types/database";

export const CARD_CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

export type ShopSort = "price-desc" | "price-asc" | "name-asc" | "name-desc" | "newest" | "oldest";

export interface ShopFilters {
  query: string;
  condition: CardCondition | "all";
  setName: string;
  printing: string;
}

export const DEFAULT_SHOP_FILTERS: ShopFilters = {
  query: "",
  condition: "all",
  setName: "",
  printing: "",
};

export const DEFAULT_SHOP_SORT: ShopSort = "price-desc";

export function searchCards(cards: Card[], query: string): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;

  return cards.filter((card) => {
    const haystack = [
      card.title,
      card.set_name,
      card.card_number,
      card.rarity,
      card.printing,
      card.condition,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterCards(cards: Card[], filters: ShopFilters): Card[] {
  return cards.filter((card) => {
    if (filters.condition !== "all" && card.condition !== filters.condition) {
      return false;
    }
    if (filters.setName && card.set_name !== filters.setName) {
      return false;
    }
    if (filters.printing && card.printing !== filters.printing) {
      return false;
    }
    return true;
  });
}

export function sortCards(cards: Card[], sort: ShopSort): Card[] {
  const sorted = [...cards];

  switch (sort) {
    case "price-desc":
      return sorted.sort((a, b) => b.price_cad - a.price_cad || a.title.localeCompare(b.title));
    case "price-asc":
      return sorted.sort((a, b) => a.price_cad - b.price_cad || a.title.localeCompare(b.title));
    case "name-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "name-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "oldest":
      return sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    default:
      return sorted;
  }
}

export function getShopFilterOptions(cards: Card[]) {
  const sets = new Set<string>();
  const printings = new Set<string>();

  for (const card of cards) {
    if (card.set_name) sets.add(card.set_name);
    if (card.printing) printings.add(card.printing);
  }

  return {
    sets: [...sets].sort((a, b) => a.localeCompare(b)),
    printings: [...printings].sort((a, b) => a.localeCompare(b)),
  };
}

export function applyShopCatalog(
  cards: Card[],
  filters: ShopFilters,
  sort: ShopSort,
): Card[] {
  return sortCards(filterCards(searchCards(cards, filters.query), filters), sort);
}
