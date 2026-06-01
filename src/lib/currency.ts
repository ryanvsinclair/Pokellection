// Collectr reports market prices in USD. We sell in CAD, so prices are converted
// on import. Adjust this rate as needed (manager can also edit any card price
// after import). Source: ~1.38 USD→CAD as of 2026-05-29.
export const USD_TO_CAD = 1.38;

/** Convert a USD amount to CAD, rounded to cents. */
export function usdToCad(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  return Math.round(amountUsd * USD_TO_CAD * 100) / 100;
}
