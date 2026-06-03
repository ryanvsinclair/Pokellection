import {
  COLLECTR_PAGE_SIZE,
  buildShowcaseUrl,
  collectrFetchHeaders,
  mapShowcaseProducts,
  parseCollectrPortfolio,
  parseCollectrShowcaseTarget,
  parseTotalCardsFromHtml,
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
function collectrScrapeError(
  profileId: string,
  collectionId: string | null,
  status: number,
  offset: number,
): string {
  const scope = collectionId
    ? `profile "${profileId}" collection ${collectionId}`
    : `profile "${profileId}" (main)`;
  const hints = [
    "Use the full URL from Collectr Share, including ?collection=… for non-main collections.",
    "The showcase must be public — private showcases often fail from the API.",
  ];
  if (status === 500 || status === 403 || status === 404) {
    hints.push(`Collectr returned ${status} for ${scope}.`);
  }
  return `Collectr API request failed (${status}) at offset ${offset} for ${scope}. ${hints.join(" ")}`;
}

async function scrapeCollectrPortfolioHtmlFromBrowser(
  profileUrl: string,
  apiMessage: string,
): Promise<CollectrScrapeResult> {
  const response = await fetch(profileUrl.trim(), {
    headers: collectrFetchHeaders(profileUrl, "text/html,application/xhtml+xml"),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Collectr API failed (${apiMessage}); showcase page request failed (${response.status}).`,
    );
  }

  const html = await response.text();
  const items = parseCollectrPortfolio(html);
  if (items.length === 0) {
    throw new Error(
      `Collectr API failed (${apiMessage}); no cards found in the showcase HTML. Check the URL is public.`,
    );
  }

  return {
    items,
    totalCards: parseTotalCardsFromHtml(html),
    source: "html",
    warning:
      `Collectr API pagination failed (${apiMessage}); ` +
      `fell back to HTML scrape (${items.length} cards from the first page only).`,
  };
}

export async function scrapeCollectrPortfolioFromBrowser(
  profileUrl: string,
): Promise<CollectrScrapeResult> {
  const trimmedUrl = profileUrl.trim();
  const target = parseCollectrShowcaseTarget(trimmedUrl);
  const allProducts: NonNullable<CollectrShowcasePage["products"]> = [];
  let offset = 0;
  let totalCards: number | null = null;

  try {
    while (offset <= MAX_OFFSET) {
      const response = await fetch(
        buildShowcaseUrl(target.profileId, offset, target.collectionId),
        {
          headers: collectrFetchHeaders(trimmedUrl, "application/json, text/plain, */*"),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          collectrScrapeError(target.profileId, target.collectionId, response.status, offset),
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
  } catch (apiError) {
    const apiMessage =
      apiError instanceof Error ? apiError.message : "Collectr API request failed";
    try {
      return await scrapeCollectrPortfolioHtmlFromBrowser(trimmedUrl, apiMessage);
    } catch (htmlError) {
      const htmlMessage =
        htmlError instanceof Error ? htmlError.message : "HTML scrape failed";
      throw new Error(`${apiMessage} ${htmlMessage}`);
    }
  }
}
