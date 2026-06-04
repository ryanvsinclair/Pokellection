import { DEFAULT_CARD_LANGUAGE } from "@/lib/card-language";
import { parseCollectrIdentityFromTags } from "@/lib/collectr-card-import";
import type { CardLanguage } from "@/types/database";
import { slugify } from "@/lib/utils";

/** Legacy infix inserted by old `collectrSlug()` — must not appear in public URLs. */
const LEGACY_COLLECTR_INFIX = /-collectr-/g;

export type ListingSlugParts = {
  title: string;
  productId: string;
  condition: string;
  productSubType?: string | null;
  gradeCompany?: string | null;
  language?: CardLanguage;
};

export function slugContainsCollectrBrand(slug: string): boolean {
  return slug.toLowerCase().includes("collectr");
}

/** Remove legacy `-collectr-` segment(s) from a slug. */
export function stripCollectrFromSlug(slug: string): string {
  return slug
    .replace(LEGACY_COLLECTR_INFIX, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Public shop slug for a Collectr-synced listing (no vendor name in URL). */
export function buildListingSlugFromCollectrItem(
  item: ListingSlugParts,
  language: CardLanguage = DEFAULT_CARD_LANGUAGE,
): string {
  const variant = [item.productSubType, item.gradeCompany]
    .map((part) => (part ? slugify(String(part)) : ""))
    .filter(Boolean)
    .join("-");

  return [
    slugify(item.title || "card"),
    item.productId,
    item.condition.toLowerCase(),
    variant,
    language !== DEFAULT_CARD_LANGUAGE ? slugify(language) : "",
  ]
    .filter(Boolean)
    .join("-");
}

type CardSlugInput = {
  slug: string;
  title: string;
  tags: string[] | null;
  condition: string;
  printing?: string | null;
  language?: CardLanguage | null;
};

/** Best-effort canonical slug from DB row (sync identity or title/condition). */
export function buildListingSlugFromCard(card: CardSlugInput): string {
  const language = card.language ?? DEFAULT_CARD_LANGUAGE;
  const identity = parseCollectrIdentityFromTags(card.tags);

  if (identity) {
    const [productId, identityCondition, productSubType, , gradeCompany] =
      identity.split("|");
    return buildListingSlugFromCollectrItem(
      {
        title: card.title,
        productId,
        condition: card.condition || identityCondition || "nm",
        productSubType: card.printing ?? (productSubType || null),
        gradeCompany: gradeCompany || null,
        language,
      },
      language,
    );
  }

  const stripped = stripCollectrFromSlug(card.slug);
  if (!slugContainsCollectrBrand(stripped)) {
    return stripped || slugify(card.title) || "card";
  }

  const variant = card.printing ? slugify(card.printing) : "";
  return [
    slugify(card.title) || "card",
    card.condition.toLowerCase(),
    variant,
    language !== DEFAULT_CARD_LANGUAGE ? slugify(language) : "",
  ]
    .filter(Boolean)
    .join("-");
}

/** If this legacy slug should 301 to a cleaner path, returns the target slug. */
export function canonicalSlugForRedirect(slug: string): string | null {
  if (!slugContainsCollectrBrand(slug)) return null;

  const stripped = stripCollectrFromSlug(slug);
  if (!slugContainsCollectrBrand(stripped) && stripped !== slug) {
    return stripped;
  }

  const withoutPrefix = stripped.replace(/^collectr-card-/, "");
  if (withoutPrefix !== stripped && !slugContainsCollectrBrand(withoutPrefix)) {
    return withoutPrefix;
  }

  return null;
}

export function cardNeedsSlugMigration(card: CardSlugInput): boolean {
  if (!slugContainsCollectrBrand(card.slug)) return false;
  const next = buildListingSlugFromCard(card);
  return next !== card.slug;
}
