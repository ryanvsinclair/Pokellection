import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import {
  collectrIdentity,
  collectrTagFor,
  parseCollectrIdentityFromTag,
  type CollectrPortfolioItem,
} from "@/lib/collectr";
import { createClient } from "@/lib/supabase/server";

interface ExistingCard {
  id: string;
  title: string;
  status: "available" | "reserved" | "sold" | "draft";
  tags: string[];
}

function parseCollectrIdentityFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr:"));
  return tagged ? parseCollectrIdentityFromTag(tagged) : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CollectrPortfolioItem[];
      totalCards?: number | null;
    };
    const scraped = body.items ?? [];
    const totalCards = body.totalCards ?? null;
    if (scraped.length === 0) {
      return NextResponse.json(
        { error: "No cards were scraped from Collectr. Try the preview again." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    await assertManager(supabase);

    const { data: cards, error } = await supabase.from("cards").select("id,title,status,tags");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const existingMap = new Map<string, ExistingCard>();
    for (const card of cards ?? []) {
      const identity = parseCollectrIdentityFromTags(card.tags);
      if (!identity) continue;
      existingMap.set(identity, card as ExistingCard);
    }

    const scrapedIdentities = new Set(scraped.map((item) => collectrIdentity(item)));
    const toAdd = scraped.filter((item) => !existingMap.has(collectrIdentity(item)));
    const toReactivate = scraped.filter(
      (item) => existingMap.get(collectrIdentity(item))?.status === "sold",
    );
    const toMarkSold = Array.from(existingMap.entries())
      .filter(([identity, card]) => !scrapedIdentities.has(identity) && card.status !== "sold")
      .map(([identity, card]) => ({
        productId: identity,
        cardId: card.id,
        title: card.title,
        status: card.status,
      }));

    return NextResponse.json({
      scrapedCount: scraped.length,
      totalCards,
      source: "api" as const,
      existingCount: existingMap.size,
      toAdd,
      toReactivate,
      toMarkSold,
      scraped,
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
