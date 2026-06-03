import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Remove a sold card from a published bundle; unpublish if no cards remain. */
export async function detachCardFromPublishedCollection(
  supabase: Client,
  collectionId: string,
  cardId: string,
): Promise<void> {
  await supabase
    .from("collection_cards")
    .delete()
    .eq("collection_id", collectionId)
    .eq("card_id", cardId);

  const { count } = await supabase
    .from("collection_cards")
    .select("card_id", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  if ((count ?? 0) === 0) {
    await supabase.from("collections").update({ status: "draft" }).eq("id", collectionId);
  }
}
