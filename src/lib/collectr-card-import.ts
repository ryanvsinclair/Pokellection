import {
  collectrIdentity,
  collectrSlug,
  collectrTagFor,
  parseCollectrIdentityFromTag,
  type CollectrPortfolioItem,
} from "@/lib/collectr";
import { soldAtForStatus } from "@/lib/card-sold";
import { roundPriceCad } from "@/lib/currency";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/card-language";
import { collectrSyncKey, collectrSyncKeyForItem } from "@/lib/collectr-sync";
import type { CardLanguage, CardStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface ExistingCollectrCard {
  id: string;
  title: string;
  tags: string[];
  status: CardStatus;
  quantity: number;
  language: CardLanguage;
  set_name: string | null;
  card_number: string | null;
  printing: string | null;
  condition: string;
}

function normalizeCardField(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function listingStatusRank(status: CardStatus): number {
  if (status === "available") return 4;
  if (status === "reserved") return 3;
  if (status === "draft") return 2;
  if (status === "sold") return 1;
  return 0;
}

/** Human-readable line for preview (set, number, printing, condition). */
export function formatCollectrListingLabel(
  parts: {
    title: string;
    setName?: string | null;
    cardNumber?: string | null;
    printing?: string | null;
    condition?: string | null;
  },
): string {
  const meta: string[] = [];
  if (parts.setName?.trim()) meta.push(parts.setName.trim());
  if (parts.cardNumber?.trim()) meta.push(`#${parts.cardNumber.trim()}`);
  if (parts.printing?.trim()) meta.push(parts.printing.trim());
  if (parts.condition?.trim()) meta.push(parts.condition.trim());
  return meta.length > 0 ? `${parts.title} (${meta.join(" · ")})` : parts.title;
}

/**
 * Collectr catalog identity (product + condition + printing + grade), not title or card number alone.
 * When both sides have set/card number stored, they must agree or we treat as a new listing.
 */
export function acquisitionMatchesExisting(
  item: CollectrPortfolioItem,
  existing: ExistingCollectrCard,
): boolean {
  if (parseCollectrIdentityFromTags(existing.tags) !== collectrIdentity(item)) {
    return false;
  }
  if (item.cardNumber && existing.card_number) {
    if (normalizeCardField(item.cardNumber) !== normalizeCardField(existing.card_number)) {
      return false;
    }
  }
  if (item.setName && existing.set_name) {
    if (normalizeCardField(item.setName) !== normalizeCardField(existing.set_name)) {
      return false;
    }
  }
  return true;
}

export function findExistingForAcquisition(
  item: CollectrPortfolioItem,
  map: Map<string, ExistingCollectrCard>,
): ExistingCollectrCard | null {
  const candidate = map.get(collectrSyncKeyForItem(DEFAULT_CARD_LANGUAGE, item));
  if (!candidate) return null;
  return acquisitionMatchesExisting(item, candidate) ? candidate : null;
}

export function parseCollectrIdentityFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith("collectr:"));
  return tagged ? parseCollectrIdentityFromTag(tagged) : null;
}

export function buildExistingCollectrMap(
  cards: {
    id: string;
    title?: string;
    tags: string[] | null;
    status: CardStatus;
    quantity: number;
    language?: CardLanguage | null;
    set_name?: string | null;
    card_number?: string | null;
    printing?: string | null;
    condition?: string;
  }[],
  options?: { language?: CardLanguage },
): Map<string, ExistingCollectrCard> {
  const map = new Map<string, ExistingCollectrCard>();
  for (const card of cards) {
    const identity = parseCollectrIdentityFromTags(card.tags);
    if (!identity) continue;

    const language = card.language ?? DEFAULT_CARD_LANGUAGE;
    if (options?.language && language !== options.language) continue;

    const row: ExistingCollectrCard = {
      id: card.id,
      title: card.title ?? "",
      tags: card.tags ?? [],
      status: card.status,
      quantity: card.quantity,
      language,
      set_name: card.set_name ?? null,
      card_number: card.card_number ?? null,
      printing: card.printing ?? null,
      condition: card.condition ?? "NM",
    };

    const key = collectrSyncKey(language, identity);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }

    existing.quantity += card.quantity;
    if (listingStatusRank(row.status) > listingStatusRank(existing.status)) {
      map.set(key, { ...row, quantity: existing.quantity });
    }
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
  language: CardLanguage = DEFAULT_CARD_LANGUAGE,
) {
  const collectrTag = collectrTagFor(item);
  return {
    title: item.title,
    slug: collectrSlug(item, language),
    set_name: item.setName,
    card_number: item.cardNumber,
    rarity: item.rarity,
    condition: item.condition,
    printing: item.productSubType,
    price_cad: roundPriceCad(item.marketPriceCad),
    quantity,
    status: "available" as const,
    language,
    description,
    tags: Array.from(new Set(["collectr", collectrTag, ...extraTags])),
    photo_paths: photoPath ? [photoPath] : [],
    featured: false,
  };
}

export function collectrIdentitiesFromItems(items: CollectrPortfolioItem[]): Set<string> {
  return new Set(items.map((item) => collectrIdentity(item)));
}
