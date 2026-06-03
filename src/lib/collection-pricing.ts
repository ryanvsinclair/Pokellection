import { roundPriceCad } from "@/lib/currency";

/** Extra CAD when buying one card from a published collection instead of the bundle. */
export const COLLECTION_SINGLE_SURCHARGE_CAD = 5;

export function collectionSinglePriceCad(cardListPriceCad: number): number {
  return roundPriceCad(Number(cardListPriceCad) + COLLECTION_SINGLE_SURCHARGE_CAD);
}
