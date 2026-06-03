import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import {
  collectrIdentity,
  collectrTagFor,
  parseCollectrIdentityFromTag,
  type CollectrPortfolioItem,
} from "@/lib/collectr";
import { parseCollectrShowcaseFromTags } from "@/lib/collectr-portfolios";
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

function matchesSyncedShowcase(
  card: ExistingCard,
  showcaseProfileIds: Set<string>,
): boolean {
  if (showcaseProfileIds.size === 0) return true;
  const showcaseId = parseCollectrShowcaseFromTags(card.tags);
  return showcaseId !== null && showcaseProfileIds.has(showcaseId);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CollectrPortfolioItem[];
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
    const toRelist = scraped.filter((item) => {
      const existing = existingMap.get(collectrIdentity(item));
      return existing && (existing.status === "sold" || existing.status === "draft");
    });
    const toDelist = Array.from(existingMap.entries())
      .filter(([identity, card]) => {
        if (scrapedIdentities.has(identity)) return false;
        if (card.status === "reserved" || card.status === "sold") return false;
        if (card.status !== "available" && card.status !== "draft") return false;
        return matchesSyncedShowcase(card, showcaseProfileIds);
      })
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
      toRelist,
      toDelist,
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
