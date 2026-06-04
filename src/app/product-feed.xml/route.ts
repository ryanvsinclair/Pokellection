import { NextResponse } from "next/server";
import {
  buildCardDescription,
  escapeXml,
  getSiteUrl,
  GOOGLE_PRODUCT_CATEGORY,
  googleMerchantAvailability,
  googleMerchantCondition,
  cardCanonicalPath,
  cardPrimaryImageUrl,
  schemaPriceCad,
} from "@/lib/seo";
import { getCachedAvailableCardsForSeo } from "@/lib/queries/seo";
import { SITE_NAME } from "@/lib/utils";

export const revalidate = 120;

/**
 * Google Merchant Center product feed (RSS 2.0 + Google namespace).
 * In Merchant Center: Feeds → Add feed → Enter this URL (requires production SITE_URL).
 */
export async function GET() {
  const siteUrl = getSiteUrl();
  const cards = await getCachedAvailableCardsForSeo();

  const items = cards
    .map((card) => {
      const link = `${siteUrl}${cardCanonicalPath(card.slug)}`;
      const image = cardPrimaryImageUrl(card);
      if (!image) return "";

      const title = escapeXml(card.title);
      const description = escapeXml(buildCardDescription(card));

      return `    <item>
      <g:id>${escapeXml(card.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${googleMerchantAvailability(card.status, card.quantity)}</g:availability>
      <g:price>${escapeXml(schemaPriceCad(card.price_cad))}</g:price>
      <g:brand>Pokémon</g:brand>
      <g:condition>${googleMerchantCondition()}</g:condition>
      <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
      <g:identifier_exists>false</g:identifier_exists>
      <g:country>CA</g:country>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Pokémon singles</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Pokémon trading cards for sale in Ottawa — pickup or Canada shipping.</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}
