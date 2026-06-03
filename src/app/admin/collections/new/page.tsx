import { createCollection } from "@/app/admin/collections/actions";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getCardIdsInActiveCollections } from "@/lib/queries/collections";
import { getAvailableCards } from "@/lib/queries/cards";
import { createClient } from "@/lib/supabase/server";

export default async function NewCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const [cards, lockedIds] = await Promise.all([
    getAvailableCards(supabase),
    getCardIdsInActiveCollections(supabase),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New collection</h2>
      <CollectionForm
        selectableCards={cards}
        lockedInOtherCollections={lockedIds}
        error={error}
        createAction={createCollection}
      />
    </div>
  );
}
