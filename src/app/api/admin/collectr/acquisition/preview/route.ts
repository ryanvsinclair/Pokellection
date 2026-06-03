import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import { collectrIdentity, type CollectrPortfolioItem } from "@/lib/collectr";
import { buildExistingCollectrMap } from "@/lib/collectr-card-import";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CollectrPortfolioItem[];
      totalCards?: number | null;
    };
    const scraped = body.items ?? [];
    if (scraped.length === 0) {
      return NextResponse.json(
        { error: "No cards were scraped from Collectr. Check the new purchases URL." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    await assertManager(supabase);

    const { data: cards, error } = await supabase
      .from("cards")
      .select("id,title,status,tags,quantity");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const existingMap = buildExistingCollectrMap(cards ?? []);

    const toAdd = scraped.filter((item) => !existingMap.has(collectrIdentity(item)));
    const toMerge = scraped
      .filter((item) => existingMap.has(collectrIdentity(item)))
      .map((item) => {
        const existing = existingMap.get(collectrIdentity(item))!;
        return {
          item,
          cardId: existing.id,
          title: existing.tags.length ? item.title : item.title,
          currentQuantity: existing.quantity,
          addQuantity: item.quantity,
          newQuantity: existing.quantity + item.quantity,
        };
      });

    return NextResponse.json({
      scrapedCount: scraped.length,
      totalCards: body.totalCards ?? null,
      newCount: toAdd.length,
      mergeCount: toMerge.length,
      toAdd,
      toMerge,
      scraped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Acquisition preview failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
