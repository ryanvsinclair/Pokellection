import {
  collectrIdentity,
  collectrSlug,
  collectrTagFor,
  parseCollectrIdentityFromTag,
  type CollectrPortfolioItem,
} from "@/lib/collectr";
import { soldAtForStatus } from "@/lib/card-sold";
import { roundPriceCad } from "@/lib/currency";
import type { CardStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface ExistingCollectrCard {
  id: string;
  tags: string[];
  status: CardStatus;
  quantity: number;
}

export function parseCollectrIdentityFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr:"));
  return tagged ? parseCollectrIdentityFromTag(tagged) : null;
}

export function buildExistingCollectrMap(
  cards: { id: string; tags: string[] | null; status: CardStatus; quantity: number }[],
): Map<string, ExistingCollectrCard> {
  const map = new Map<string, ExistingCollectrCard>();
  for (const card of cards) {
    const identity = parseCollectrIdentityFromTags(card.tags);
    if (!identity) continue;
    map.set(identity, {
      id: card.id,
      tags: card.tags ?? [],
      status: card.status,
      quantity: card.quantity,
    });
  }
  return map;
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "jpg";
}

export async function uploadCollectrPhoto(
  supabase: Client,
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

export function statusWhenListedInCollectr(existing: ExistingCollectrCard): CardStatus {
  if (existing.status === "reserved") return "reserved";
  return "available";
}

export function patchWhenListedInCollectr(existing: ExistingCollectrCard) {
  const status = statusWhenListedInCollectr(existing);
  return { status, sold_at: soldAtForStatus(status) };
}

export function cardRowFromCollectrItem(
  item: CollectrPortfolioItem,
  extraTags: string[],
  photoPath: string | null,
  quantity: number,
  description: string,
) {
  const collectrTag = collectrTagFor(item);
  return {
    title: item.title,
    slug: collectrSlug(item),
    set_name: item.setName,
    card_number: item.cardNumber,
    rarity: item.rarity,
    condition: item.condition,
    printing: item.productSubType,
    price_cad: roundPriceCad(item.marketPriceCad),
    quantity,
    status: "available" as const,
    description,
    tags: Array.from(new Set(["collectr", collectrTag, ...extraTags])),
    photo_paths: photoPath ? [photoPath] : [],
    featured: false,
  };
}

export function collectrIdentitiesFromItems(items: CollectrPortfolioItem[]): Set<string> {
  return new Set(items.map((item) => collectrIdentity(item)));
}
