import {
  mergeCollectrPortfolioItems,
  parseCollectrShowcaseTarget,
  parseProfileIdFromUrl,
  showcaseScopeIdFromTarget,
  type CollectrPortfolioItem,
} from "@/lib/collectr";
import { DEFAULT_CARD_LANGUAGE, isCardLanguage } from "@/lib/card-language";
import { syncKeyForCollectrSyncItem, type CollectrSyncItem } from "@/lib/collectr-sync";
import type { CardLanguage } from "@/types/database";

export type { CollectrSyncItem } from "@/lib/collectr-sync";

function languageFromPortfolioLabel(label: string): CardLanguage {
  const lower = label.toLowerCase();
  if (lower.includes("french")) return "french";
  if (lower.includes("korean")) return "korean";
  if (lower.includes("japan")) return "japanese";
  return DEFAULT_CARD_LANGUAGE;
}

export interface CollectrPortfolioConfig {
  id: string;
  label: string;
  url: string;
  language: CardLanguage;
}

/** @deprecated Prefer `language` / `showcaseScopeId` on each `CollectrSyncItem`. */
export type CollectrSyncMetadata = {
  languages: Record<string, CardLanguage>;
  showcaseScopeIds: Record<string, string>;
};

function metadataFromSyncItems(items: CollectrSyncItem[]): CollectrSyncMetadata {
  const languages: Record<string, CardLanguage> = {};
  const showcaseScopeIds: Record<string, string> = {};
  for (const item of items) {
    const key = syncKeyForCollectrSyncItem(item);
    languages[key] = item.language;
    showcaseScopeIds[key] = item.showcaseScopeId;
  }
  return { languages, showcaseScopeIds };
}

export function collectrShowcaseTag(profileId: string): string {
  return `collectr-showcase:${profileId}`;
}

export function parseCollectrShowcaseFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr-showcase:"));
  return tagged ? tagged.slice("collectr-showcase:".length) : null;
}

export function mergeTagsForCollectrSync(
  existingTags: string[] | null,
  collectrTag: string,
  showcaseScopeId: string,
): string[] {
  const withoutShowcase = (existingTags ?? []).filter(
    (tag) => !tag.startsWith("collectr-showcase:"),
  );
  return Array.from(
    new Set([
      ...withoutShowcase,
      "collectr",
      collectrTag,
      collectrShowcaseTag(showcaseScopeId),
    ]),
  );
}

export function profileIdFromPortfolioUrl(url: string): string {
  return parseProfileIdFromUrl(url.trim());
}

/** Sync/delist scope: `?collection=` UUID when set, else profile handle. */
export function showcaseScopeIdFromPortfolioUrl(url: string): string {
  return showcaseScopeIdFromTarget(parseCollectrShowcaseTarget(url.trim()));
}

export function parseCollectrPortfoliosFromDb(value: unknown): CollectrPortfolioConfig[] {
  if (!Array.isArray(value)) return [];

  const portfolios: CollectrPortfolioConfig[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const label = String(record.label ?? "").trim();
    const url = String(record.url ?? "").trim();
    const id = String(record.id ?? "").trim() || crypto.randomUUID();
    if (!url) continue;
    const rawLanguage = record.language;
    const language =
      typeof rawLanguage === "string" && isCardLanguage(rawLanguage)
        ? rawLanguage
        : languageFromPortfolioLabel(label);
    portfolios.push({ id, label: label || url, url, language });
  }
  return portfolios;
}

export function normalizeCollectrPortfolios(
  portfolios: CollectrPortfolioConfig[],
): CollectrPortfolioConfig[] {
  const seen = new Set<string>();
  const normalized: CollectrPortfolioConfig[] = [];

  for (const portfolio of portfolios) {
    const url = portfolio.url.trim();
    if (!url) continue;

    profileIdFromPortfolioUrl(url);
    const label = portfolio.label.trim() || url;
    const id = portfolio.id.trim() || crypto.randomUUID();
    if (seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      label,
      url,
      language: portfolio.language ?? languageFromPortfolioLabel(label),
    });
  }

  return normalized;
}

export async function scrapeCollectrPortfoliosFromBrowser(
  portfolios: CollectrPortfolioConfig[],
  scrapeOne: (url: string) => Promise<{ items: CollectrPortfolioItem[]; totalCards: number | null }>,
): Promise<{
  items: CollectrSyncItem[];
  totalCards: number | null;
  showcaseProfileIds: string[];
  sources: { label: string; count: number; language: CardLanguage }[];
  syncMetadata: CollectrSyncMetadata;
}> {
  if (portfolios.length === 0) {
    throw new Error("Add at least one Collectr portfolio URL.");
  }

  const bySyncKey = new Map<string, CollectrSyncItem>();
  const sources: { label: string; count: number; language: CardLanguage }[] = [];
  const showcaseProfileIds: string[] = [];
  let totalCards: number | null = null;

  for (const portfolio of portfolios) {
    const scopeId = showcaseScopeIdFromPortfolioUrl(portfolio.url);
    showcaseProfileIds.push(scopeId);

    const result = await scrapeOne(portfolio.url);
    const dedupedInShowcase = mergeCollectrPortfolioItems(result.items);

    sources.push({
      label: portfolio.label,
      count: dedupedInShowcase.length,
      language: portfolio.language,
    });

    for (const item of dedupedInShowcase) {
      const syncItem: CollectrSyncItem = {
        ...item,
        language: portfolio.language,
        showcaseScopeId: scopeId,
      };
      const key = syncKeyForCollectrSyncItem(syncItem);
      const existing = bySyncKey.get(key);
      if (existing) {
        existing.quantity += syncItem.quantity;
      } else {
        bySyncKey.set(key, { ...syncItem });
      }
    }

    if (result.totalCards != null) {
      totalCards = (totalCards ?? 0) + result.totalCards;
    }
  }

  const items = Array.from(bySyncKey.values());
  if (items.length === 0) {
    throw new Error("No owned Pokemon cards found in the selected portfolio(s).");
  }

  return {
    items,
    totalCards,
    showcaseProfileIds,
    sources,
    syncMetadata: metadataFromSyncItems(items),
  };
}
