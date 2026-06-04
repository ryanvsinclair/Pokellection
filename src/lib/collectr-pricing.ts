import type { CardLanguage } from "@/types/database";
import { roundPriceCad } from "@/lib/currency";

/**
 * French inventory is priced below English equivalents. Collectr still reports
 * English-market USD; we apply a tiered discount on the CAD reference at sync.
 * Higher market → lower % (floor 50%), cheaper cards → higher % (up to 70%).
 */
const FRENCH_MARKET_TIERS: { upToCad: number; multiplier: number }[] = [
  { upToCad: 10, multiplier: 0.7 },
  { upToCad: 25, multiplier: 0.65 },
  { upToCad: 50, multiplier: 0.6 },
  { upToCad: 100, multiplier: 0.55 },
  { upToCad: Number.POSITIVE_INFINITY, multiplier: 0.5 },
];

export function frenchSellMultiplierFromMarketCad(collectrMarketPriceCad: number): number {
  const market =
    Number.isFinite(collectrMarketPriceCad) && collectrMarketPriceCad > 0
      ? collectrMarketPriceCad
      : 0;

  for (const tier of FRENCH_MARKET_TIERS) {
    if (market < tier.upToCad) return tier.multiplier;
  }
  return 0.5;
}

/** List price written to `cards.price_cad` from a Collectr sync row. */
export function collectrListPriceCad(
  language: CardLanguage,
  collectrMarketPriceCad: number,
): number {
  if (language !== "french") {
    return roundPriceCad(collectrMarketPriceCad);
  }

  const multiplier = frenchSellMultiplierFromMarketCad(collectrMarketPriceCad);
  return roundPriceCad(collectrMarketPriceCad * multiplier);
}
