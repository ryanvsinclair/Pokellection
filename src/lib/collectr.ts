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

function collectrFetchHeaders(profileUrl: string, accept: string): HeadersInit {
  return {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept,
    origin: "https://app.getcollectr.com",
    referer: profileUrl,
  };
}

export function parseProfileIdFromUrl(profileUrl: string): string {
  const url = new URL(profileUrl);
  const segment = decodeURIComponent(url.pathname.replace(/\/+$/, "")).split("/").pop() ?? "";
  const profileId = segment.replace(/^@/, "").trim();
  if (!profileId) {
    throw new Error("Invalid Collectr profile URL.");
  }
  return profileId;
}

function buildCollectrTitle(
  name: string,
  subType: string | null,
  gradeCompany: string | null,
): string {
  let title = name;
  // "Normal" is the default printing; only surface notable variants.
  if (subType && subType.toLowerCase() !== "normal") {
    title += ` (${subType})`;
  }
  if (gradeCompany) {
    title += ` [${gradeCompany}]`;
  }
  return title;
}

function mapRawProduct(row: CollectrRawItem): CollectrPortfolioItem | null {
  if (!row.product_id || !row.product_name || !row.is_card) return null;
  if (row.catalog_category_name?.toLowerCase() !== "pokemon") return null;
  if (!row.is_owned) return null;

  const productSubType = row.product_sub_type?.trim() || null;
  const gradeCompany = row.grade_company?.trim() || null;

  return {
    productId: row.product_id,
    title: buildCollectrTitle(row.product_name.trim(), productSubType, gradeCompany),
    setName: row.catalog_group?.trim() || null,
    cardNumber: row.card_number?.trim() || null,
    rarity: row.rarity?.trim() || null,
    imageUrl: row.image_url?.trim() || null,
    marketPriceCad: Number.parseFloat(row.market_price ?? "0") || 0,
    quantity: Number.parseInt(row.quantity ?? "1", 10) || 1,
    condition: mapCondition(row.card_condition),
    productSubType,
    gradeId: row.grade_id?.trim() || null,
    gradeCompany,
  };
}

export function buildShowcaseUrl(profileId: string, offset: number): string {
  const query = buildCollectrQuery({
    searchString: "",
    offset,
    limit: COLLECTR_PAGE_SIZE,
    id: "",
    sortType: "",
    sortOrder: "",
    groupId: "",
    unstackedView: "true",
  });
  return (
    `${COLLECTR_API_BASE}/data/showcase/${encodeURIComponent(profileId)}` +
    `?${query}&username=${COLLECTR_ANON_USERNAME}`
  );
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

export function parseTotalCardsFromHtml(html: string): number | null {
  const match = html.match(/"total_cards":"(\d+)"/);
  if (!match) return null;
  const total = Number.parseInt(match[1], 10);
  return Number.isFinite(total) ? total : null;
}

export function parseCollectrPortfolio(html: string): CollectrPortfolioItem[] {
  // [\s\S] instead of . with the /s flag keeps this compatible with the ES2017 build target.
  const escapedMatches =
    html.match(/\{\\"product_id\\":\\"[\s\S]*?\\"is_card\\":(?:true|false)[\s\S]*?\}/g) ?? [];
  const parsedItems: CollectrPortfolioItem[] = [];

  for (const escaped of escapedMatches) {
    try {
      const json = decodeEscapedJson(escaped);
      const row = JSON.parse(json) as CollectrRawItem;
      const item = mapRawProduct(row);
      if (item) parsedItems.push(item);
    } catch {
      // Skip malformed chunks and continue parsing others.
    }
  }

  const deduped = new Map<string, CollectrPortfolioItem>();
  for (const item of parsedItems) {
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

async function fetchShowcasePage(
  profileId: string,
  offset: number,
  profileUrl: string,
): Promise<CollectrShowcasePage> {
  const url = buildShowcaseUrl(profileId, offset);

  const response = await fetch(url, {
    headers: collectrFetchHeaders(profileUrl, "application/json, text/plain, */*"),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Collectr API request failed (${response.status})`);
  }

  return (await response.json()) as CollectrShowcasePage;
}

async function fetchAllShowcaseProductsViaApi(
  profileId: string,
  profileUrl: string,
): Promise<CollectrScrapeResult> {
  const allProducts: CollectrRawItem[] = [];
  let offset = 0;
  let totalCards: number | null = null;

  while (true) {
    const page = await fetchShowcasePage(profileId, offset, profileUrl);
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

  return { items, totalCards, source: "api" };
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
  const profileId = parseProfileIdFromUrl(trimmedUrl);

  try {
    return await fetchAllShowcaseProductsViaApi(profileId, trimmedUrl);
  } catch (apiError) {
    const apiMessage = apiError instanceof Error ? apiError.message : "Collectr API request failed";

    try {
      const html = await fetchProfileHtml(trimmedUrl);
      const items = parseCollectrPortfolio(html);
      if (items.length === 0) {
        throw new Error("No portfolio cards found. Check the profile URL and make sure the showcase is public.");
      }

      return {
        items,
        totalCards: parseTotalCardsFromHtml(html),
        source: "html",
        warning:
          `Collectr API pagination failed (${apiMessage}); ` +
          `fell back to HTML scrape (${items.length} cards from the first page only).`,
      };
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

export function collectrSlug(item: CollectrPortfolioItem): string {
  return [
    slugify(item.title || "collectr-card"),
    "collectr",
    item.productId,
    item.condition.toLowerCase(),
  ].join("-");
}
