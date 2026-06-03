import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import { collectrIdentity, collectrTagFor, type CollectrPortfolioItem } from "@/lib/collectr";
import {
  buildExistingCollectrMap,
  cardRowFromCollectrItem,
  patchWhenListedInCollectr,
  uploadCollectrPhoto,
  type ExistingCollectrCard,
} from "@/lib/collectr-card-import";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/card-language";
import {
  collectrShowcaseTag,
  mergeTagsForCollectrSync,
  parseCollectrShowcaseFromTags,
} from "@/lib/collectr-portfolios";
import { roundPriceCad } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import type { CardLanguage } from "@/types/database";

function matchesSyncedShowcase(
  card: ExistingCollectrCard,
  showcaseProfileIds: Set<string>,
): boolean {
  if (showcaseProfileIds.size === 0) return true;
  const showcaseId = parseCollectrShowcaseFromTags(card.tags);
  return showcaseId !== null && showcaseProfileIds.has(showcaseId);
}

function languageForItem(
  identity: string,
  itemLanguages: Record<string, CardLanguage> | undefined,
): CardLanguage {
  return itemLanguages?.[identity] ?? DEFAULT_CARD_LANGUAGE;
}

function scopeIdForItem(
  identity: string,
  itemShowcaseScopeIds: Record<string, string> | undefined,
  fallbackScopeIds: string[],
): string | null {
  const fromItem = itemShowcaseScopeIds?.[identity];
  if (fromItem) return fromItem;
  return fallbackScopeIds[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scraped?: CollectrPortfolioItem[];
      showcaseProfileIds?: string[];
      itemLanguages?: Record<string, CardLanguage>;
      itemShowcaseScopeIds?: Record<string, string>;
    };
    const scraped = body.scraped ?? [];
    const showcaseProfileIds = new Set(body.showcaseProfileIds ?? []);
    const itemLanguages = body.itemLanguages;
    const itemShowcaseScopeIds = body.itemShowcaseScopeIds;
    const fallbackScopeIds = body.showcaseProfileIds ?? [];

    if (scraped.length === 0) {
      return NextResponse.json({ error: "No preview data to apply." }, { status: 400 });
    }

    const supabase = await createClient();
    await assertManager(supabase);

    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id,tags,status,quantity");
    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 400 });
    }

    const existingMap = buildExistingCollectrMap(cards ?? []);

    const scrapedIdentities = new Set(scraped.map((item) => collectrIdentity(item)));
    const toDelist = Array.from(existingMap.entries()).filter(([identity, card]) => {
      if (scrapedIdentities.has(identity)) return false;
      if (card.status === "reserved" || card.status === "sold") return false;
      if (card.status !== "available" && card.status !== "draft") return false;
      return matchesSyncedShowcase(card, showcaseProfileIds);
    });

    let added = 0;
    let updated = 0;
    let delisted = 0;

    for (const item of scraped) {
      const identity = collectrIdentity(item);
      const existing = existingMap.get(identity);
      const collectrTag = collectrTagFor(item);
      const language = languageForItem(identity, itemLanguages);
      const scopeId = scopeIdForItem(identity, itemShowcaseScopeIds, fallbackScopeIds);
      const showcaseTags =
        scopeId !== null ? [collectrShowcaseTag(scopeId)] : [];

      if (!existing) {
        const photoPath = await uploadCollectrPhoto(supabase, item);
        const { error: insertError } = await supabase
          .from("cards")
          .insert(
            cardRowFromCollectrItem(
              item,
              showcaseTags,
              photoPath,
              item.quantity,
              "Imported from Collectr showcase.",
              language,
            ),
          );
        if (!insertError) added += 1;
        continue;
      }

      const mergedTags =
        scopeId !== null
          ? mergeTagsForCollectrSync(existing.tags, collectrTag, scopeId)
          : Array.from(new Set([...(existing.tags ?? []), "collectr", collectrTag]));

      const { error: updateError } = await supabase
        .from("cards")
        .update({
          title: item.title,
          set_name: item.setName,
          card_number: item.cardNumber,
          rarity: item.rarity,
          condition: item.condition,
          printing: item.productSubType,
          price_cad: roundPriceCad(item.marketPriceCad),
          quantity: item.quantity,
          language,
          ...patchWhenListedInCollectr(existing),
          tags: mergedTags,
        })
        .eq("id", existing.id);

      if (!updateError) updated += 1;
    }

    for (const [, card] of toDelist) {
      const { error } = await supabase
        .from("cards")
        .update({ status: "draft" })
        .eq("id", card.id);
      if (!error) delisted += 1;
    }

    revalidatePath("/admin/cards");
    revalidatePath("/shop");
    revalidatePath("/admin/import");
    revalidatePath("/collections");

    return NextResponse.json({
      added,
      updated,
      delisted,
      totalScraped: scraped.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync apply failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
