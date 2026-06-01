import { CardGrid } from "@/components/CardGrid";
import { getAvailableCards } from "@/lib/queries/cards";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const supabase = await createClient();
  const cards = await getAvailableCards(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="mt-1 text-sm text-muted">
          All available singles — pickup in Ottawa or ship anywhere in Canada.
        </p>
      </div>
      <CardGrid cards={cards} />
    </div>
  );
}
