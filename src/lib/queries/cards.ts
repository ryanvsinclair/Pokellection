import type { SupabaseClient } from "@supabase/supabase-js";
import { getCardIdsInPublishedCollections } from "@/lib/queries/collections";
import { logSupabaseFetchError } from "@/lib/supabase/env";
import type { Card, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Price bands for the home page “Latest arrivals” mix (CAD). */
export const LATEST_ARRIVAL_TIERS = [
  { label: "$15–20", min: 15, max: 20 },
  { label: "$20–40", min: 20, max: 40, minExclusive: true },
  { label: "$40–50", min: 40, max: 50, minExclusive: true },
  { label: "$50–100", min: 50, max: 100, minExclusive: true },
  { label: "$100+", min: 100, max: null, minExclusive: true },
] as const;

const LATEST_ARRIVALS_PER_TIER = 2;

function excludeCollectionBundleCards(cards: Card[], hiddenIds: Set<string>): Card[] {
  if (hiddenIds.size === 0) return cards;
  return cards.filter((card) => !hiddenIds.has(card.id));
}

async function getLatestArrivalsInTier(
  supabase: Client,
  tier: (typeof LATEST_ARRIVAL_TIERS)[number],
  limit: number,
  hiddenIds: Set<string>,
): Promise<Card[]> {
  const fetchLimit = hiddenIds.size > 0 ? limit * 4 : limit;
  let query = supabase.from("cards").select("*").eq("status", "available");

  if ("minExclusive" in tier && tier.minExclusive) {
    query = query.gt("price_cad", tier.min);
  } else {
    query = query.gte("price_cad", tier.min);
  }

  if (tier.max !== null) {
    query = query.lte("price_cad", tier.max);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (error) {
    logSupabaseFetchError(`getLatestArrivalsInTier(${tier.label})`, error);
    return [];
  }
  return excludeCollectionBundleCards(data ?? [], hiddenIds).slice(0, limit);
}

/** Interleave newest cards from each price band for a balanced home grid. */
function mixLatestArrivalTiers(tierResults: Card[][]): Card[] {
  const seen = new Set<string>();
  const mixed: Card[] = [];
  const maxRows = Math.max(0, ...tierResults.map((rows) => rows.length));

  for (let i = 0; i < maxRows; i++) {
    for (const rows of tierResults) {
      const card = rows[i];
      if (card && !seen.has(card.id)) {
        seen.add(card.id);
        mixed.push(card);
      }
    }
  }

  return mixed;
}

/** Latest arrivals across {@link LATEST_ARRIVAL_TIERS} (2 per band by default). */
export async function getLatestArrivals(
  supabase: Client,
  perTier = LATEST_ARRIVALS_PER_TIER,
): Promise<Card[]> {
  const hiddenIds = await getCardIdsInPublishedCollections(supabase);
  const tierResults = await Promise.all(
    LATEST_ARRIVAL_TIERS.map((tier) =>
      getLatestArrivalsInTier(supabase, tier, perTier, hiddenIds),
    ),
  );
  return mixLatestArrivalTiers(tierResults);
}

/** All singles for sale (excludes cards reserved in a published collection). */
export async function getAvailableCards(supabase: Client): Promise<Card[]> {
  const hiddenIds = await getCardIdsInPublishedCollections(supabase);
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "available")
    .order("price_cad", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    logSupabaseFetchError("getAvailableCards", error);
    return [];
  }
  return excludeCollectionBundleCards(data ?? [], hiddenIds);
}

/** A single available card by slug, or null. Use for public detail pages. */
export async function getAvailableCardBySlug(
  supabase: Client,
  slug: string,
): Promise<Card | null> {
  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", slug)
    .eq("status", "available")
    .single();
  return data ?? null;
}

/** Any card by id regardless of status (manager contexts). */
export async function getCardById(supabase: Client, id: string): Promise<Card | null> {
  const { data } = await supabase.from("cards").select("*").eq("id", id).single();
  return data ?? null;
}

/** All cards, newest first (manager listing). */
export async function getAllCards(supabase: Client): Promise<Card[]> {
  const { data } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
