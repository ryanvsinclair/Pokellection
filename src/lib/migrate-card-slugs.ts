import {
  buildListingSlugFromCard,
  cardNeedsSlugMigration,
  slugContainsCollectrBrand,
} from "@/lib/card-slug";
import type { Card } from "@/types/database";

export type SlugMigrationRow = Pick<
  Card,
  "id" | "slug" | "title" | "tags" | "condition" | "printing" | "language"
>;

export type SlugMigrationPlan = {
  id: string;
  oldSlug: string;
  newSlug: string;
};

export function planCardSlugMigrations(cards: SlugMigrationRow[]): SlugMigrationPlan[] {
  const taken = new Set<string>();
  const plans: SlugMigrationPlan[] = [];

  for (const card of cards) {
    if (!cardNeedsSlugMigration(card) && !slugContainsCollectrBrand(card.slug)) {
      taken.add(card.slug);
      continue;
    }

    let candidate = buildListingSlugFromCard(card);
    if (!candidate || slugContainsCollectrBrand(candidate)) {
      continue;
    }

    let suffix = 2;
    const base = candidate;
    while (taken.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    taken.add(candidate);

    if (candidate !== card.slug) {
      plans.push({ id: card.id, oldSlug: card.slug, newSlug: candidate });
    }
  }

  return plans;
}
