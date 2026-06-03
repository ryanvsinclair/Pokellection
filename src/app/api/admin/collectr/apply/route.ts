import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import {
  collectrIdentity,
  collectrSlug,
  collectrTagFor,
  parseCollectrIdentityFromTag,
  type CollectrPortfolioItem,
} from "@/lib/collectr";
import {
  collectrShowcaseTag,
  parseCollectrShowcaseFromTags,
} from "@/lib/collectr-portfolios";
import { soldAtForStatus } from "@/lib/card-sold";
import { roundPriceCad } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import type { CardStatus } from "@/types/database";

interface ExistingCollectrCard {
  id: string;
  tags: string[];
  status: CardStatus;
}

function parseCollectrIdentityFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr:"));
  return tagged ? parseCollectrIdentityFromTag(tagged) : null;
}

function statusWhenListedInCollectr(existing: ExistingCollectrCard): CardStatus {
  if (existing.status === "reserved") return "reserved";
  return "available";
}

function patchWhenListedInCollectr(existing: ExistingCollectrCard) {
  const status = statusWhenListedInCollectr(existing);
  return { status, sold_at: soldAtForStatus(status) };
}

function matchesSyncedShowcase(
  card: ExistingCollectrCard,
  showcaseProfileIds: Set<string>,
): boolean {
  if (showcaseProfileIds.size === 0) return true;
  const showcaseId = parseCollectrShowcaseFromTags(card.tags);
  return showcaseId !== null && showcaseProfileIds.has(showcaseId);
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "jpg";
}

async function uploadCollectrPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  item: CollectrPortfolioItem,
): Promise<string | null> {
  if (!item.imageUrl) return null;

  try {
    const imageResponse = await fetch(item.imageUrl, { cache: "no-store" });
    if (!imageResponse.ok) return null;
    const contentType = imageResponse.headers.get("content-type");
    const ext = extensionFromContentType(contentType);
    const path = `cards/collectr/${item.productId}-${Date.now()}.${ext}`;
    const bytes = await imageResponse.arrayBuffer();

    const { error } = await supabase.storage.from("card-photos").upload(path, bytes, {
      contentType: contentType ?? undefined,
      upsert: false,
    });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scraped?: CollectrPortfolioItem[];
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
      .select("id,tags,status");
    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 400 });
    }

    const existingMap = new Map<string, ExistingCollectrCard>();
    for (const card of cards ?? []) {
      const identity = parseCollectrIdentityFromTags(card.tags);
      if (!identity) continue;
      existingMap.set(identity, card as ExistingCollectrCard);
    }

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
      const showcaseTags = [...showcaseProfileIds].map((id) => collectrShowcaseTag(id));

      if (!existing) {
        const photoPath = await uploadCollectrPhoto(supabase, item);
        const { error: insertError } = await supabase.from("cards").insert({
          title: item.title,
          slug: collectrSlug(item),
          set_name: item.setName,
          card_number: item.cardNumber,
          rarity: item.rarity,
          condition: item.condition,
          printing: item.productSubType,
          price_cad: roundPriceCad(item.marketPriceCad),
          quantity: item.quantity,
          status: "available",
          description: "Imported from Collectr showcase.",
          tags: ["collectr", collectrTag, ...showcaseTags],
          photo_paths: photoPath ? [photoPath] : [],
          featured: false,
        });
        if (!insertError) added += 1;
        continue;
      }

      const mergedTags = Array.from(
        new Set([...(existing.tags ?? []), "collectr", collectrTag, ...showcaseTags]),
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
