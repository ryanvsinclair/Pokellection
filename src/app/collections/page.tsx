import { CollectionGrid } from "@/components/CollectionGrid";
import { getAvailableCollections } from "@/lib/queries/collections";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Collections",
};

export default async function CollectionsPage() {
  const supabase = await createClient();
  const collections = await getAvailableCollections(supabase);

  const counts = await Promise.all(
    collections.map(async (collection) => {
      const { count } = await supabase
        .from("collection_cards")
        .select("card_id", { count: "exact", head: true })
        .eq("collection_id", collection.id);
      return { id: collection.id, count: count ?? 0 };
    }),
  );
  const cardCounts = Object.fromEntries(counts.map((row) => [row.id, row.count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="mt-1 text-sm text-muted">
          Curated bundles of cards at a set price.
        </p>
      </div>
      <CollectionGrid collections={collections} cardCounts={cardCounts} />
    </div>
  );
}
