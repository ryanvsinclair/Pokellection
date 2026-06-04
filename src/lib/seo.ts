import type { Metadata } from "next";
import type { Card, Collection } from "@/types/database";
import {
  formatCad,
  formatCondition,
  getPhotoUrl,
  LOCATION,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/utils";

/** Google product taxonomy: Collectible Trading Cards */
export const GOOGLE_PRODUCT_CATEGORY = "6997";

const LANGUAGE_LABELS: Record<string, string> = {
  english: "English",
  french: "French",
  japanese: "Japanese",
  korean: "Korean",
};

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return url || "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function cardCanonicalPath(slug: string): string {
  return `/shop/${encodeURIComponent(slug)}`;
}

export function collectionCanonicalPath(slug: string): string {
  return `/collections/${encodeURIComponent(slug)}`;
}

export function cardPrimaryImageUrl(card: Pick<Card, "photo_paths">): string | undefined {
  const path = card.photo_paths?.[0]?.trim();
  if (!path) return undefined;
  const url = getPhotoUrl(path);
  return url || undefined;
}

export function buildCardDescription(card: Pick<
  Card,
  "title" | "set_name" | "condition" | "language" | "rarity" | "card_number" | "description" | "price_cad"
>): string {
  if (card.description?.trim()) return card.description.trim();

  const parts = [
    card.title,
    card.set_name,
    card.card_number ? `#${card.card_number}` : null,
    formatCondition(card.condition),
    LANGUAGE_LABELS[card.language] ?? card.language,
    card.rarity,
    `${formatCad(card.price_cad)} CAD`,
    `Pickup in ${LOCATION} or ship anywhere in Canada.`,
  ].filter(Boolean);

  return parts.join(" · ");
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  imageUrl?: string;
  /** Omit for indexable pages; set true for checkout/account */
  noIndex?: boolean;
};

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const images = input.imageUrl ? [{ url: input.imageUrl, alt: input.title }] : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_CA",
      url,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: input.imageUrl ? [input.imageUrl] : undefined,
    },
  };
}

export function schemaPriceCad(amount: number): string {
  return `${amount.toFixed(2)} CAD`;
}

export function schemaAvailability(
  status: Card["status"],
  quantity: number,
): "https://schema.org/InStock" | "https://schema.org/OutOfStock" {
  if (status === "available" && quantity > 0) {
    return "https://schema.org/InStock";
  }
  return "https://schema.org/OutOfStock";
}

export function googleMerchantAvailability(
  status: Card["status"],
  quantity: number,
): "in stock" | "out of stock" {
  return status === "available" && quantity > 0 ? "in stock" : "out of stock";
}

/** Singles are NM–DMG; Merchant Center uses `used` for collectible cards. */
export function googleMerchantCondition(): "used" {
  return "used";
}

export function buildOrganizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    areaServed: {
      "@type": "City",
      name: "Ottawa",
      containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" },
    },
  };
}

export function buildWebSiteJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
  };
}

export function buildProductJsonLd(card: Card) {
  const url = absoluteUrl(cardCanonicalPath(card.slug));
  const image = cardPrimaryImageUrl(card);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.title,
    description: buildCardDescription(card),
    image: image ? [image] : undefined,
    sku: card.id,
    url,
    brand: { "@type": "Brand", name: "Pokémon" },
    category: "Trading Card",
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "CAD",
      price: Number(card.price_cad).toFixed(2),
      availability: schemaAvailability(card.status, card.quantity),
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
    ...(card.set_name ? { isRelatedTo: { "@type": "Product", name: card.set_name } } : {}),
  };
}

export function buildBreadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildCollectionProductJsonLd(
  collection: Collection,
  memberCount: number,
) {
  const url = absoluteUrl(collectionCanonicalPath(collection.slug));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: collection.title,
    description:
      collection.description?.trim() ||
      `${memberCount} Pokémon cards — bundle ${formatCad(collection.price_cad)}. ${SITE_DESCRIPTION}`,
    url,
    brand: { "@type": "Brand", name: "Pokémon" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "CAD",
      price: Number(collection.price_cad).toFixed(2),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function buildItemListJsonLd(
  items: { name: string; url: string }[],
  listName: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 50).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
