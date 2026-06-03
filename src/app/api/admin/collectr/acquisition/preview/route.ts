import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import { collectrIdentity, type CollectrPortfolioItem } from "@/lib/collectr";
import {
  buildExistingCollectrMap,
  findExistingForAcquisition,
  formatCollectrListingLabel,
} from "@/lib/collectr-card-import";
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
      .select("id,title,status,tags,quantity,language,set_name,card_number,printing,condition");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const existingMap = buildExistingCollectrMap(cards ?? [], { language: "english" });

    const toAdd: CollectrPortfolioItem[] = [];
    const toMerge: {
      item: CollectrPortfolioItem;
      cardId: string;
      scrapedLabel: string;
      existingLabel: string;
      currentQuantity: number;
      addQuantity: number;
      newQuantity: number;
    }[] = [];

    for (const item of scraped) {
      const existing = findExistingForAcquisition(item, existingMap);
      if (!existing) {
        toAdd.push(item);
        continue;
      }

      toMerge.push({
        item,
        cardId: existing.id,
        scrapedLabel: formatCollectrListingLabel({
          title: item.title,
          setName: item.setName,
          cardNumber: item.cardNumber,
          printing: item.productSubType,
          condition: item.condition,
        }),
        existingLabel: formatCollectrListingLabel({
          title: existing.title,
          setName: existing.set_name,
          cardNumber: existing.card_number,
          printing: existing.printing,
          condition: existing.condition,
        }),
        currentQuantity: existing.quantity,
        addQuantity: item.quantity,
        newQuantity: existing.quantity + item.quantity,
      });
    }

    return NextResponse.json({
      scrapedCount: scraped.length,
      totalCards: body.totalCards ?? null,
      newCount: toAdd.length,
      mergeCount: toMerge.length,
      toAdd,
      toMerge,
      scraped,
      matchNote:
        "Qty bumps match English inventory only (same Collectr catalog ID + set/# when on file). " +
        "French/Japanese/Korean listings are separate and are not merged from temp import.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Acquisition preview failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
