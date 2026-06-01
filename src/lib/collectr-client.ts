import {
  COLLECTR_PAGE_SIZE,
  buildShowcaseUrl,
  mapShowcaseProducts,
  parseProfileIdFromUrl,
  type CollectrScrapeResult,
  type CollectrShowcasePage,
} from "@/lib/collectr";

const PAGE_DELAY_MS = 150;
// Safety cap so a malformed response can never loop forever (covers ~6k cards).
const MAX_OFFSET = 6000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrapes a Collectr showcase from the browser. Collectr's API blocks
 * server-side clients via TLS fingerprinting, but a real browser request
 * succeeds and the API allows cross-origin reads (Access-Control-Allow-Origin: *),
 * so the admin's browser can paginate the full portfolio directly.
 */
export async function scrapeCollectrPortfolioFromBrowser(
  profileUrl: string,
): Promise<CollectrScrapeResult> {
  const profileId = parseProfileIdFromUrl(profileUrl.trim());
  const allProducts: NonNullable<CollectrShowcasePage["products"]> = [];
  let offset = 0;
  let totalCards: number | null = null;

  while (offset <= MAX_OFFSET) {
    const response = await fetch(buildShowcaseUrl(profileId, offset), {
      headers: { accept: "application/json, text/plain, */*" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Collectr API request failed (${response.status}) at offset ${offset}.`,
      );
    }

    const page = (await response.json()) as CollectrShowcasePage;
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
    throw new Error(
      "No owned Pokemon cards found. Make sure the showcase URL is correct and public.",
    );
  }

  return { items, totalCards, source: "api" };
}
