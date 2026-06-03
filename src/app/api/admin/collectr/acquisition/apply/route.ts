import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import { acquisitionTag } from "@/lib/collectr-acquisition";
import { collectrIdentity, type CollectrPortfolioItem } from "@/lib/collectr";
import {
  buildExistingCollectrMap,
  cardRowFromCollectrItem,
  findExistingForAcquisition,
  patchWhenListedInCollectr,
  uploadCollectrPhoto,
} from "@/lib/collectr-card-import";
import { roundPriceCad } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scraped?: CollectrPortfolioItem[];
      purchasePriceCad?: number;
      label?: string;
      note?: string;
      showcaseUrl?: string;
    };

    const scraped = body.scraped ?? [];
    const purchasePriceCad = Number(body.purchasePriceCad);
    if (scraped.length === 0) {
      return NextResponse.json({ error: "No preview data to apply." }, { status: 400 });
    }
    if (!Number.isFinite(purchasePriceCad) || purchasePriceCad < 0) {
      return NextResponse.json({ error: "Enter a valid purchase price (CAD)." }, { status: 400 });
    }

    const supabase = await createClient();
    await assertManager(supabase);

    const { data: acquisition, error: acqError } = await supabase
      .from("inventory_acquisitions")
      .insert({
        purchase_price_cad: purchasePriceCad,
        collectr_showcase_url: body.showcaseUrl?.trim() || null,
        label: body.label?.trim() || null,
        note: body.note?.trim() || null,
        card_count: scraped.length,
      })
      .select("id")
      .single();

    if (acqError || !acquisition) {
      return NextResponse.json({ error: acqError?.message ?? "Could not save acquisition." }, { status: 400 });
    }

    const acqTag = acquisitionTag(acquisition.id);

    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id,title,tags,status,quantity,set_name,card_number,printing,condition");
    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 400 });
    }

    const existingMap = buildExistingCollectrMap(cards ?? []);

    let added = 0;
    let merged = 0;
    const linkRows: { acquisition_id: string; card_id: string; quantity_added: number }[] = [];

    for (const item of scraped) {
      const identity = collectrIdentity(item);
      const existing = findExistingForAcquisition(item, existingMap);

      if (!existing) {
        const photoPath = await uploadCollectrPhoto(supabase, item);
        const { data: inserted, error: insertError } = await supabase
          .from("cards")
          .insert(
            cardRowFromCollectrItem(
              item,
              [acqTag],
              photoPath,
              item.quantity,
              "Imported from new purchases Collectr hold.",
            ),
          )
          .select("id")
          .single();

        if (!insertError && inserted) {
          added += 1;
          linkRows.push({
            acquisition_id: acquisition.id,
            card_id: inserted.id,
            quantity_added: item.quantity,
          });
          existingMap.set(identity, {
            id: inserted.id,
            title: item.title,
            tags: ["collectr", acqTag],
            status: "available",
            quantity: item.quantity,
            set_name: item.setName,
            card_number: item.cardNumber,
            printing: item.productSubType,
            condition: item.condition,
          });
        }
        continue;
      }

      const newQty = existing.quantity + item.quantity;
      const mergedTags = Array.from(new Set([...existing.tags, acqTag]));

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
          quantity: newQty,
          ...patchWhenListedInCollectr(existing),
          tags: mergedTags,
        })
        .eq("id", existing.id);

      if (!updateError) {
        merged += 1;
        linkRows.push({
          acquisition_id: acquisition.id,
          card_id: existing.id,
          quantity_added: item.quantity,
        });
        existing.quantity = newQty;
      }
    }

    if (linkRows.length > 0) {
      await supabase.from("acquisition_cards").insert(linkRows);
    }

    revalidatePath("/admin/cards");
    revalidatePath("/admin/acquisitions");
    revalidatePath("/shop");
    revalidatePath("/admin/import");

    return NextResponse.json({
      acquisitionId: acquisition.id,
      added,
      merged,
      totalScraped: scraped.length,
      purchasePriceCad,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Acquisition apply failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
