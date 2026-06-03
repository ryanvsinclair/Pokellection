import {
  mergeCollectrPortfolioItems,
  parseProfileIdFromUrl,
  type CollectrPortfolioItem,
} from "@/lib/collectr";

export interface CollectrPortfolioConfig {
  id: string;
  label: string;
  url: string;
}

export function collectrShowcaseTag(profileId: string): string {
  return `collectr-showcase:${profileId}`;
}

export function parseCollectrShowcaseFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr-showcase:"));
  return tagged ? tagged.slice("collectr-showcase:".length) : null;
}

export function profileIdFromPortfolioUrl(url: string): string {
  return parseProfileIdFromUrl(url.trim());
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
    portfolios.push({ id, label: label || url, url });
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
    normalized.push({ id, label, url });
  }

  return normalized;
}

export async function scrapeCollectrPortfoliosFromBrowser(
  portfolios: CollectrPortfolioConfig[],
  scrapeOne: (url: string) => Promise<{ items: CollectrPortfolioItem[]; totalCards: number | null }>,
): Promise<{
  items: CollectrPortfolioItem[];
  totalCards: number | null;
  showcaseProfileIds: string[];
  sources: { label: string; count: number }[];
}> {
  if (portfolios.length === 0) {
    throw new Error("Add at least one Collectr portfolio URL.");
  }

  const merged: CollectrPortfolioItem[] = [];
  const sources: { label: string; count: number }[] = [];
  const showcaseProfileIds: string[] = [];
  let totalCards: number | null = null;

  for (const portfolio of portfolios) {
    const profileId = profileIdFromPortfolioUrl(portfolio.url);
    showcaseProfileIds.push(profileId);

    const result = await scrapeOne(portfolio.url);
    sources.push({ label: portfolio.label, count: result.items.length });
    merged.push(...result.items);

    if (result.totalCards != null) {
      totalCards = (totalCards ?? 0) + result.totalCards;
    }
  }

  const items = mergeCollectrPortfolioItems(merged);
  if (items.length === 0) {
    throw new Error("No owned Pokemon cards found in the selected portfolio(s).");
  }

  return { items, totalCards, showcaseProfileIds, sources };
}
