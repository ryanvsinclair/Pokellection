import { DEFAULT_CARD_LANGUAGE } from "@/lib/card-language";
import { importPriceCad } from "@/lib/currency";
import type { CardLanguage } from "@/types/database";
import { slugify } from "@/lib/utils";

export interface CollectrPortfolioItem {
  productId: string;
  title: string;
  setName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  imageUrl: string | null;
  marketPriceCad: number;
  quantity: number;
  condition: "NM" | "LP" | "MP" | "HP" | "DMG";
  // Collectr distinguishes printings (Normal / Reverse Holofoil / 1st Edition / …)
  // and grading, which can have wildly different value, so they are part of a
  // listing's identity, not just its display.
  productSubType: string | null;
  gradeId: string | null;
  gradeCompany: string | null;
}

export interface CollectrScrapeResult {
  items: CollectrPortfolioItem[];
  totalCards: number | null;
  source: "api" | "html";
  warning?: string;
}

interface CollectrRawItem {
  product_id?: string;
  catalog_category_name?: string;
  catalog_group?: string;
  product_name?: string;
  image_url?: string;
  card_number?: string;
  rarity?: string;
  quantity?: string;
  market_price?: string;
  is_owned?: boolean;
  is_card?: boolean;
  card_condition?: string;
  product_sub_type?: string;
  grade_id?: string;
  grade_company?: string | null;
}

export interface CollectrShowcasePage {
  total_cards?: string;
  products?: CollectrRawItem[];
}

export const COLLECTR_API_BASE = "https://api-v2.getcollectr.com";
export const COLLECTR_ANON_USERNAME = "00000000-0000-0000-0000-000000000000";
export const COLLECTR_PAGE_SIZE = 30;
const PAGE_DELAY_MS = 200;

function decodeEscapedJson(raw: string): string {
  return raw
    .replace(/\\"/g, "\"")
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\\\/g, "\\");
}

function mapCondition(value: string | undefined): "NM" | "LP" | "MP" | "HP" | "DMG" {
  const normalized = (value ?? "").toUpperCase();
  if (normalized.includes("NM") || normalized.includes("MINT")) return "NM";
  if (normalized.includes("LP")) return "LP";
  if (normalized.includes("MP")) return "MP";
  if (normalized.includes("HP")) return "HP";
  if (normalized.includes("DMG") || normalized.includes("DAMAGED")) return "DMG";
  return "LP";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCollectrQuery(params: Record<string, string | number | undefined | null>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
}

const COLLECTR_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Node/server only — browsers ignore forbidden Referer/Origin header overrides. */
export function collectrFetchHeaders(profileUrl: string, accept: string): HeadersInit {
  return {
    "user-agent": COLLECTR_USER_AGENT,
    accept,
    origin: "https://app.getcollectr.com",
    referer: profileUrl,
  };
}

/**
 * Browser fetch to Collectr's API. Must set `referrer` (not a Referer header) so
 * Collectr sees the showcase URL; otherwise production sends the admin page URL
 * and sub-collection requests often return 500.
 */
export function collectrBrowserFetchInit(profileUrl: string, accept: string): RequestInit {
  return {
    headers: {
      accept,
    },
    referrer: profileUrl.trim(),
    referrerPolicy: "unsafe-url",
    cache: "no-store",
    mode: "cors",
  };
}

/** Server-side paginated fetch (used by scrape-html and the showcase proxy route). */
export async function fetchCollectrShowcasePage(
  profileUrl: string,
  offset: number,
): Promise<CollectrShowcasePage> {
  const trimmedUrl = profileUrl.trim();
  const target = parseCollectrShowcaseTarget(trimmedUrl);
  return fetchShowcasePage(target, offset, trimmedUrl);
}

export interface CollectrShowcaseTarget {
  profileId: string;
  /** Non-main Collectr collection from `?collection=<uuid>` (API query param `id`). */
  collectionId: string | null;
}

export function parseProfileIdFromUrl(profileUrl: string): string {
  return parseCollectrShowcaseTarget(profileUrl).profileId;
}

export function parseCollectrShowcaseTarget(profileUrl: string): CollectrShowcaseTarget {
  const trimmed = profileUrl.trim();
  const url = new URL(trimmed);
  const parts = decodeURIComponent(url.pathname.replace(/\/+$/, ""))
    .split("/")
    .filter(Boolean);

  const profileIndex = parts.findIndex((part) => part === "profile");
  const handle =
    profileIndex >= 0 && parts[profileIndex + 1]
      ? parts[profileIndex + 1]
      : (parts.at(-1) ?? "");

  const profileId = handle.replace(/^@/, "").trim();
  if (!profileId) {
    throw new Error(
      "Invalid Collectr profile URL. Use the showcase link from Share (e.g. …/showcase/profile/@username).",
    );
  }

  const collectionId = url.searchParams.get("collection")?.trim() || null;
  return { profileId, collectionId };
}

/** Delist/sync scope id: collection UUID when present, otherwise profile handle. */
export function showcaseScopeIdFromTarget(target: CollectrShowcaseTarget): string {
  return target.collectionId ?? target.profileId;
}

function buildCollectrTitle(name: string, gradeCompany: string | null): string {
  // Printing/sub-type is stored in its own `printing` column, so the title stays
  // clean ("Gastly", not "Gastly (Reverse Holofoil)"). Grade is kept inline since
  // there is no dedicated grade column.
  return gradeCompany ? `${name} [${gradeCompany}]` : name;
}

function mapRawProduct(row: CollectrRawItem): CollectrPortfolioItem | null {
  if (!row.product_id || !row.product_name || !row.is_card) return null;
  if (row.catalog_category_name?.toLowerCase() !== "pokemon") return null;
  if (!row.is_owned) return null;

  const productSubType = row.product_sub_type?.trim() || null;
  const gradeCompany = row.grade_company?.trim() || null;

  return {
    productId: row.product_id,
    title: buildCollectrTitle(row.product_name.trim(), gradeCompany),
    setName: row.catalog_group?.trim() || null,
    cardNumber: row.card_number?.trim() || null,
    rarity: row.rarity?.trim() || null,
    imageUrl: row.image_url?.trim() || null,
    // Collectr's market_price is USD — convert to CAD on import.
    marketPriceCad: importPriceCad(Number.parseFloat(row.market_price ?? "0")),
    quantity: Number.parseInt(row.quantity ?? "1", 10) || 1,
    condition: mapCondition(row.card_condition),
    productSubType,
    gradeId: row.grade_id?.trim() || null,
    gradeCompany,
  };
}

export function buildShowcaseUrl(
  profileId: string,
  offset: number,
  collectionId?: string | null,
  options: ShowcaseUrlOptions = {},
): string {
  const includeUnstacked =
    options.unstackedView ?? (collectionId ? false : true);
  const includeOffset = !(options.omitOffset && offset === 0);
  const query = buildCollectrQuery({
    searchString: "",
    ...(includeOffset ? { offset } : {}),
    limit: COLLECTR_PAGE_SIZE,
    id: collectionId ?? "",
    sortType: "",
    sortOrder: "",
    groupId: "",
    ...(options.filters ? { filters: "[]" } : {}),
    ...(includeUnstacked ? { unstackedView: "true" } : {}),
  });
  return (
    `${COLLECTR_API_BASE}/data/showcase/${encodeURIComponent(profileId)}` +
    `?${query}&username=${COLLECTR_ANON_USERNAME}`
  );
}

/** Server-side HTML scrape when the browser cannot reach Collectr (API 500 / CORS). */
export async function scrapeCollectrPortfolioFromHtmlUrl(
  profileUrl: string,
  apiMessage?: string,
): Promise<CollectrScrapeResult> {
  const trimmedUrl = profileUrl.trim();
  const target = parseCollectrShowcaseTarget(trimmedUrl);
  const html = await fetchProfileHtml(trimmedUrl);
  const totalCards = parseTotalCardsFromHtml(html);
  let items = parseCollectrPortfolio(html);
  if (items.length === 0) {
    throw new Error(
      "No cards found in the showcase HTML. Check the URL is public and includes ?collection=… when needed.",
    );
  }

  items = await supplementShowcaseViaApi(target, trimmedUrl, items, totalCards);

  return {
    items,
    totalCards,
    source: "html",
    warning: incompleteHtmlWarning(items.length, totalCards, apiMessage),
  };
}

export function mapShowcaseProducts(rows: CollectrRawItem[]): CollectrPortfolioItem[] {
  // Identity is product + condition: the same card in different conditions
  // (e.g. LP vs MP) is a separate listing, while identical copies are stacked
  // into a single listing by summing their quantities.
  const deduped = new Map<string, CollectrPortfolioItem>();
  for (const row of rows) {
    const item = mapRawProduct(row);
    if (!item) continue;
    const key = collectrIdentity(item);
    const existing = deduped.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      deduped.set(key, item);
    }
  }
  return Array.from(deduped.values());
}

/** Merge listings from multiple Collectr showcases (same identity → summed quantity). */
export function mergeCollectrPortfolioItems(
  items: CollectrPortfolioItem[],
): CollectrPortfolioItem[] {
  const deduped = new Map<string, CollectrPortfolioItem>();
  for (const item of items) {
    const key = collectrIdentity(item);
    const existing = deduped.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      deduped.set(key, { ...item });
    }
  }
  return Array.from(deduped.values());
}

export function parseTotalCardsFromHtml(html: string): number | null {
  const patterns = [/"total_cards":"(\d+)"/, /\\"total_cards\\":\\"(\d+)\\"/];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const total = Number.parseInt(match[1], 10);
    if (Number.isFinite(total)) return total;
  }
  return null;
}

export type ShowcaseUrlOptions = {
  /** Main showcase uses true; sub-collections omit this (Collectr app query). */
  unstackedView?: boolean;
  /** Matches Collectr `getShowcaseProfile` dehydrated query (`filters: []`). */
  filters?: boolean;
  /** First page in the Collectr app omits `offset` (only page 2+ sends it). */
  omitOffset?: boolean;
};

export function showcaseApiUrlsForPage(
  profileId: string,
  offset: number,
  collectionId: string | null,
): string[] {
  const urls: string[] = [];
  if (collectionId) {
    if (offset === 0) {
      urls.push(
        buildShowcaseUrl(profileId, 0, collectionId, {
          filters: true,
          omitOffset: true,
        }),
      );
    }
    urls.push(
      buildShowcaseUrl(profileId, offset, collectionId, {
        filters: true,
      }),
    );
    urls.push(
      buildShowcaseUrl(profileId, offset, collectionId, {
        filters: true,
        unstackedView: true,
      }),
    );
  }
  if (offset === 0) {
    urls.push(buildShowcaseUrl(profileId, 0, collectionId, { omitOffset: true }));
  }
  urls.push(buildShowcaseUrl(profileId, offset, collectionId));
  return [...new Set(urls)];
}

function parseEscapedJsonArrayAt(html: string, startIndex: number): CollectrRawItem[] | null {
  const openBracket = html.indexOf("[", startIndex);
  if (openBracket < 0) return null;

  let depth = 0;
  for (let i = openBracket; i < html.length; i += 1) {
    const char = html[i];
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const decoded = decodeEscapedJson(html.slice(openBracket, i + 1));
          const parsed = JSON.parse(decoded) as unknown;
          if (!Array.isArray(parsed)) return null;
          return parsed.filter(
            (row): row is CollectrRawItem =>
              typeof row === "object" && row !== null && "product_id" in row,
          );
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractRawProductsFromHtml(html: string): CollectrRawItem[] {
  const rows: CollectrRawItem[] = [];

  for (const match of html.matchAll(/\\"products\\":\[/g)) {
    const fromArray = parseEscapedJsonArrayAt(html, match.index ?? 0);
    if (fromArray) rows.push(...fromArray);
  }

  const escapedMatches =
    html.match(/\{\\"product_id\\":\\"[\s\S]*?\\"is_card\\":(?:true|false)[\s\S]*?\}/g) ?? [];
  for (const escaped of escapedMatches) {
    try {
      const json = decodeEscapedJson(escaped);
      rows.push(JSON.parse(json) as CollectrRawItem);
    } catch {
      // Skip malformed chunks and continue parsing others.
    }
  }

  return rows;
}

export function parseCollectrPortfolio(html: string): CollectrPortfolioItem[] {
  return mapShowcaseProducts(extractRawProductsFromHtml(html));
}

function collectrApiScopeLabel(target: CollectrShowcaseTarget, offset: number): string {
  const scope = target.collectionId
    ? `profile "${target.profileId}" collection ${target.collectionId}`
    : `profile "${target.profileId}" (main)`;
  return `${scope} at offset ${offset}`;
}

async function fetchShowcasePage(
  target: CollectrShowcaseTarget,
  offset: number,
  profileUrl: string,
): Promise<CollectrShowcasePage> {
  const urls = showcaseApiUrlsForPage(target.profileId, offset, target.collectionId);
  let lastStatus = 0;

  for (const url of urls) {
    const response = await fetch(url, {
      headers: collectrFetchHeaders(profileUrl, "application/json, text/plain, */*"),
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as CollectrShowcasePage;
    }

    lastStatus = response.status;
    if (response.status !== 500) {
      break;
    }
  }

  throw new Error(
    `Collectr API request failed (${lastStatus || 500}) for ${collectrApiScopeLabel(target, offset)}`,
  );
}

function incompleteHtmlWarning(
  itemCount: number,
  totalCards: number | null,
  apiMessage?: string,
): string | undefined {
  if (totalCards == null || itemCount >= totalCards) {
    return apiMessage
      ? `${apiMessage} Fell back to server HTML scrape (${itemCount} cards from embedded page data).`
      : undefined;
  }

  const missing = totalCards - itemCount;
  const parts = [
    apiMessage,
    `Fell back to server HTML scrape: ${itemCount} of ${totalCards} cards.`,
    `${missing} card(s) are only on later Collectr API pages; the API returned errors from this environment.`,
    "Open the same showcase on app.getcollectr.com (scroll to load all cards), then retry preview from that browser, or sync from local dev if the API works there.",
  ];
  return parts.filter(Boolean).join(" ");
}

async function supplementShowcaseViaApi(
  target: CollectrShowcaseTarget,
  profileUrl: string,
  existingItems: CollectrPortfolioItem[],
  totalCards: number | null,
): Promise<CollectrPortfolioItem[]> {
  if (totalCards == null || existingItems.length >= totalCards) {
    return existingItems;
  }

  const allProducts: CollectrRawItem[] = [];
  let offset = existingItems.length;

  while (offset < totalCards) {
    try {
      const page = await fetchShowcasePage(target, offset, profileUrl);
      const products = page.products ?? [];
      if (products.length === 0) break;
      allProducts.push(...products);
      offset += COLLECTR_PAGE_SIZE;
      await sleep(PAGE_DELAY_MS);
    } catch {
      break;
    }
  }

  if (allProducts.length === 0) return existingItems;
  const extraItems = mapShowcaseProducts(allProducts);
  return mergeCollectrPortfolioItems([...existingItems, ...extraItems]);
}

async function fetchAllShowcaseProductsViaApi(
  target: CollectrShowcaseTarget,
  profileUrl: string,
): Promise<CollectrScrapeResult> {
  const allProducts: CollectrRawItem[] = [];
  let offset = 0;
  let totalCards: number | null = null;

  while (true) {
    const page = await fetchShowcasePage(target, offset, profileUrl);
    if (totalCards === null && page.total_cards) {
      const parsedTotal = Number.parseInt(page.total_cards, 10);
      totalCards = Number.isFinite(parsedTotal) ? parsedTotal : null;
    }

    const products = page.products ?? [];
    if (products.length === 0) break;

    allProducts.push(...products);
    offset += COLLECTR_PAGE_SIZE;
    await sleep(PAGE_DELAY_MS);
  }

  const items = mapShowcaseProducts(allProducts);
  if (items.length === 0) {
    throw new Error("No portfolio cards found in Collectr API response.");
  }

  const warning =
    totalCards != null && items.length < totalCards
      ? `Pulled ${items.length} of ${totalCards} cards from the Collectr API (pagination stopped early).`
      : undefined;

  return { items, totalCards, source: "api", warning };
}

async function fetchProfileHtml(profileUrl: string): Promise<string> {
  const response = await fetch(profileUrl, {
    headers: collectrFetchHeaders(profileUrl, "text/html,application/xhtml+xml"),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Collectr page request failed (${response.status})`);
  }

  return response.text();
}

export async function scrapeCollectrPortfolio(profileUrl: string): Promise<CollectrScrapeResult> {
  const trimmedUrl = profileUrl.trim();
  const target = parseCollectrShowcaseTarget(trimmedUrl);

  try {
    return await fetchAllShowcaseProductsViaApi(target, trimmedUrl);
  } catch (apiError) {
    const apiMessage = apiError instanceof Error ? apiError.message : "Collectr API request failed";
    try {
      return await scrapeCollectrPortfolioFromHtmlUrl(trimmedUrl, apiMessage);
    } catch (htmlError) {
      const htmlMessage = htmlError instanceof Error ? htmlError.message : "HTML scrape failed";
      throw new Error(`Collectr sync failed. API: ${apiMessage}. HTML fallback: ${htmlMessage}.`);
    }
  }
}

// The fields that make a Collectr listing unique. The same catalog product can
// be owned in different conditions, printings (sub types), and grades — each is
// a separate sellable listing with its own price/photo/stock.
export interface CollectrVariantKey {
  productId: string;
  condition: string;
  productSubType: string | null;
  gradeId: string | null;
  gradeCompany: string | null;
}

export function collectrIdentity(item: CollectrVariantKey): string {
  return [
    item.productId,
    item.condition,
    item.productSubType ?? "",
    item.gradeId ?? "",
    item.gradeCompany ?? "",
  ].join("|");
}

export function collectrTagFor(item: CollectrVariantKey): string {
  return `collectr:${collectrIdentity(item)}`;
}

export function parseCollectrIdentityFromTag(tag: string): string | null {
  return tag.startsWith("collectr:") ? tag.slice("collectr:".length) : null;
}

export function collectrSlug(
  item: CollectrPortfolioItem,
  language: CardLanguage = DEFAULT_CARD_LANGUAGE,
): string {
  // The title no longer encodes the printing, so product + condition alone would
  // collide across printings (e.g. Gastly NM Reverse Holofoil vs NM Normal).
  // Include printing and grade to keep the slug unique per listing.
  const variant = [item.productSubType, item.gradeCompany]
    .map((part) => (part ? slugify(String(part)) : ""))
    .filter(Boolean)
    .join("-");
  return [
    slugify(item.title || "collectr-card"),
    "collectr",
    item.productId,
    item.condition.toLowerCase(),
    variant,
    language !== DEFAULT_CARD_LANGUAGE ? slugify(language) : "",
  ]
    .filter(Boolean)
    .join("-");
}
