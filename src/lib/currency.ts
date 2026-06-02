// Collectr reports market prices in USD. We sell in CAD, so prices are converted
// on import. Adjust this rate as needed (manager can also edit any card price
// after import). Source: ~1.38 USD→CAD as of 2026-05-29.
export const USD_TO_CAD = 1.38;

/** Convert a USD amount to CAD, rounded to cents. */
export function usdToCad(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  return Math.round(amountUsd * USD_TO_CAD * 100) / 100;
}

/**
 * Shop pricing rules (applied on every write to `cards.price_cad`):
 * - Under $0.50 → $0.50
 * - Under $1.00 → $1.00
 * - $1.00 and above → round down to the nearest whole dollar
 */
export function roundPriceCad(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount < 0.5) return 0.5;
  if (amount < 1) return 1;
  return Math.floor(amount);
}

/** USD market price → CAD shop price with rounding rules applied. */
export function importPriceCad(amountUsd: number): number {
  return roundPriceCad(usdToCad(amountUsd));
}
