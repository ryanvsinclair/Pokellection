import {
  COLLECTR_PAGE_SIZE,
  collectrFetchHeaders,
  mapShowcaseProducts,
  parseCollectrShowcaseTarget,
  showcaseApiUrlsForPage,
  type CollectrScrapeResult,
  type CollectrShowcasePage,
  type CollectrShowcaseTarget,
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

async function scrapeCollectrPortfolioHtmlViaServer(
  profileUrl: string,
  apiMessage: string,
): Promise<CollectrScrapeResult> {
  const response = await fetch("/api/admin/collectr/scrape-html", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: profileUrl.trim(), apiMessage }),
  });

  const payload = (await response.json()) as CollectrScrapeResult & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Server HTML scrape failed (${response.status}).`);
  }

  return payload;
}

async function fetchShowcasePageFromBrowser(
  target: CollectrShowcaseTarget,
  offset: number,
  profileUrl: string,
): Promise<CollectrShowcasePage> {
  const urls = showcaseApiUrlsForPage(target.profileId, offset, target.collectionId);
  let lastError: Error | null = null;

  for (const url of urls) {
    const response = await fetch(url, {
      headers: collectrFetchHeaders(profileUrl, "application/json, text/plain, */*"),
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as CollectrShowcasePage;
    }

    lastError = new Error(
      collectrScrapeError(target.profileId, target.collectionId, response.status, offset),
    );
    if (response.status !== 500) {
      throw lastError;
    }
  }

  throw lastError ?? new Error("Collectr API request failed");
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
      const page = await fetchShowcasePageFromBrowser(target, offset, trimmedUrl);
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
      return await scrapeCollectrPortfolioHtmlViaServer(trimmedUrl, apiMessage);
    } catch (htmlError) {
      const htmlMessage =
        htmlError instanceof Error ? htmlError.message : "HTML scrape failed";
      throw new Error(`${apiMessage} ${htmlMessage}`);
    }
  }
}
