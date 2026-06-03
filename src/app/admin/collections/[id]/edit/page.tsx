import { CollectionForm } from "@/components/admin/CollectionForm";
import { getAvailableCards } from "@/lib/queries/cards";
import {
  getCardIdsInActiveCollections,
  getCollectionById,
} from "@/lib/queries/collections";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditCollectionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [collection, availableCards, lockedIds] = await Promise.all([
    getCollectionById(supabase, id),
    getAvailableCards(supabase),
    getCardIdsInActiveCollections(supabase),
  ]);

  if (!collection) notFound();

  const memberCards = collection.cards.map((row) => row.card);
  const selectableCards = [
    ...memberCards,
    ...availableCards.filter(
      (card) => !memberCards.some((member) => member.id === card.id),
    ),
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Edit collection</h2>
      <CollectionForm
        collection={collection}
        selectableCards={selectableCards}
        lockedInOtherCollections={lockedIds}
        error={error}
      />
    </div>
  );
}
