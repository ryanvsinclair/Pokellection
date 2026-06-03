import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import { collectrTagFor } from "@/lib/collectr";
import {
  buildExistingCollectrMap,
  cardRowFromCollectrItem,
  patchWhenListedInCollectr,
  uploadCollectrPhoto,
  type ExistingCollectrCard,
} from "@/lib/collectr-card-import";
import {
  collectrShowcaseTag,
  mergeTagsForCollectrSync,
  parseCollectrShowcaseFromTags,
} from "@/lib/collectr-portfolios";
import {
  syncKeyForCollectrSyncItem,
  type CollectrSyncItem,
} from "@/lib/collectr-sync";
import { roundPriceCad } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

function matchesSyncedShowcase(
  card: ExistingCollectrCard,
  showcaseProfileIds: Set<string>,
): boolean {
  if (showcaseProfileIds.size === 0) return true;
  const showcaseId = parseCollectrShowcaseFromTags(card.tags);
  return showcaseId !== null && showcaseProfileIds.has(showcaseId);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scraped?: CollectrSyncItem[];
      showcaseProfileIds?: string[];
    };
    const scraped = body.scraped ?? [];
    const showcaseProfileIds = new Set(body.showcaseProfileIds ?? []);

    if (scraped.length === 0) {
      return NextResponse.json({ error: "No preview data to apply." }, { status: 400 });
    }

    const supabase = await createClient();
    await assertManager(supabase);

    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id,tags,status,quantity,language");
    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 400 });
    }

    const existingMap = buildExistingCollectrMap(cards ?? []);

    const scrapedSyncKeys = new Set(scraped.map((item) => syncKeyForCollectrSyncItem(item)));
    const toDelist = Array.from(existingMap.entries()).filter(([syncKey, card]) => {
      if (scrapedSyncKeys.has(syncKey)) return false;
      if (card.status === "reserved" || card.status === "sold") return false;
      if (card.status !== "available" && card.status !== "draft") return false;
      return matchesSyncedShowcase(card, showcaseProfileIds);
    });

    let added = 0;
    let updated = 0;
    let delisted = 0;

    for (const item of scraped) {
      const syncKey = syncKeyForCollectrSyncItem(item);
      const existing = existingMap.get(syncKey);
      const collectrTag = collectrTagFor(item);
      const showcaseTags = [collectrShowcaseTag(item.showcaseScopeId)];

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
              item.language,
            ),
          );
        if (!insertError) added += 1;
        continue;
      }

      if (existing.language !== item.language) {
        continue;
      }

      const mergedTags = mergeTagsForCollectrSync(
        existing.tags,
        collectrTag,
        item.showcaseScopeId,
      );

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
          language: item.language,
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
