import { collectrIdentity, type CollectrPortfolioItem } from "@/lib/collectr";
import type { CardLanguage } from "@/types/database";

/** Stable key: one row per language + Collectr catalog identity (not cross-language). */
export function collectrSyncKey(language: CardLanguage, identity: string): string {
  return `${language}:${identity}`;
}

export function collectrSyncKeyForItem(
  language: CardLanguage,
  item: CollectrPortfolioItem,
): string {
  return collectrSyncKey(language, collectrIdentity(item));
}

export type CollectrSyncItem = CollectrPortfolioItem & {
  language: CardLanguage;
  showcaseScopeId: string;
};

export function syncKeyForCollectrSyncItem(item: CollectrSyncItem): string {
  return collectrSyncKey(item.language, collectrIdentity(item));
}
