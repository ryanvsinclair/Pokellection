import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import { collectrTagFor } from "@/lib/collectr";
import {
  buildExistingCollectrMap,
  parseCollectrIdentityFromTags,
} from "@/lib/collectr-card-import";
import { parseCollectrShowcaseFromTags } from "@/lib/collectr-portfolios";
import {
  syncKeyForCollectrSyncItem,
  type CollectrSyncItem,
} from "@/lib/collectr-sync";
import { createClient } from "@/lib/supabase/server";

function matchesSyncedShowcase(
  card: { tags: string[] },
  showcaseProfileIds: Set<string>,
): boolean {
  if (showcaseProfileIds.size === 0) return true;
  const showcaseId = parseCollectrShowcaseFromTags(card.tags);
  return showcaseId !== null && showcaseProfileIds.has(showcaseId);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CollectrSyncItem[];
      totalCards?: number | null;
      showcaseProfileIds?: string[];
    };
    const scraped = body.items ?? [];
    const totalCards = body.totalCards ?? null;
    const showcaseProfileIds = new Set(body.showcaseProfileIds ?? []);
    if (scraped.length === 0) {
      return NextResponse.json(
        { error: "No cards were scraped from Collectr. Try the preview again." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    await assertManager(supabase);

    const { data: cards, error } = await supabase
      .from("cards")
      .select("id,title,status,tags,language,quantity");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const existingMap = buildExistingCollectrMap(cards ?? []);

    const scrapedSyncKeys = new Set(scraped.map((item) => syncKeyForCollectrSyncItem(item)));
    const toAdd = scraped.filter((item) => !existingMap.has(syncKeyForCollectrSyncItem(item)));
    const toRelist = scraped.filter((item) => {
      const existing = existingMap.get(syncKeyForCollectrSyncItem(item));
      return existing && (existing.status === "sold" || existing.status === "draft");
    });
    const toDelist = Array.from(existingMap.entries())
      .filter(([syncKey, card]) => {
        if (scrapedSyncKeys.has(syncKey)) return false;
        if (card.status === "reserved" || card.status === "sold") return false;
        if (card.status !== "available" && card.status !== "draft") return false;
        return matchesSyncedShowcase(card, showcaseProfileIds);
      })
      .map(([syncKey, card]) => {
        const identity = parseCollectrIdentityFromTags(card.tags) ?? syncKey;
        return {
          productId: identity,
          cardId: card.id,
          title: card.title,
          status: card.status,
        };
      });

    const syncMetadata = {
      languages: Object.fromEntries(
        scraped.map((item) => [syncKeyForCollectrSyncItem(item), item.language]),
      ),
      showcaseScopeIds: Object.fromEntries(
        scraped.map((item) => [syncKeyForCollectrSyncItem(item), item.showcaseScopeId]),
      ),
    };

    return NextResponse.json({
      scrapedCount: scraped.length,
      totalCards,
      source: "api" as const,
      existingCount: existingMap.size,
      toAdd,
      toRelist,
      toDelist,
      scraped,
      itemLanguages: syncMetadata.languages,
      itemShowcaseScopeIds: syncMetadata.showcaseScopeIds,
      tagsExample: [
        collectrTagFor({
          productId: "12345",
          condition: "LP",
          productSubType: "Normal",
          gradeId: null,
          gradeCompany: null,
        }),
        "collectr",
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
