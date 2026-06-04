import type { Metadata } from "next";
import { CollectionGrid } from "@/components/CollectionGrid";
import {
  getAvailableCollections,
  getCollectionListingMeta,
} from "@/lib/queries/collections";
import { buildPageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { LOCATION } from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: "Pokémon card collections",
  description: `Curated Pokémon card bundles at set prices — ${LOCATION} pickup or ship across Canada.`,
  path: "/collections",
});

export const revalidate = 60;

export default async function CollectionsPage() {
  const supabase = await createClient();
  const collections = await getAvailableCollections(supabase);

  const { cardCounts, previewImages } = await getCollectionListingMeta(
    supabase,
    collections.map((c) => c.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="mt-1 text-sm text-muted">
          Curated bundles of cards at a set price.
        </p>
      </div>
      <CollectionGrid
        collections={collections}
        cardCounts={cardCounts}
        previewImages={previewImages}
      />
    </div>
  );
}
