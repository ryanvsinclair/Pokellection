import type { MetadataRoute } from "next";
import {
  getCachedAvailableCardsForSeo,
  getCachedCollectionSlugsForSeo,
} from "@/lib/queries/seo";
import { absoluteUrl, cardCanonicalPath, collectionCanonicalPath, getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  const [cards, collections] = await Promise.all([
    getCachedAvailableCardsForSeo(),
    getCachedCollectionSlugsForSeo(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl("/shop"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/collections"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  const cardRoutes: MetadataRoute.Sitemap = cards.map((card) => ({
    url: absoluteUrl(cardCanonicalPath(card.slug)),
    lastModified: new Date(card.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = collections.map((row) => ({
    url: absoluteUrl(collectionCanonicalPath(row.slug)),
    lastModified: new Date(row.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...cardRoutes, ...collectionRoutes];
}
