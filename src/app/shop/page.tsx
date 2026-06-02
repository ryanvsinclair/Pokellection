import { ShopBrowser } from "@/components/ShopBrowser";
import { getAvailableCards } from "@/lib/queries/cards";
import { getCartQuantitiesByCardId } from "@/lib/queries/cart";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [cards, cartQtyByCardId] = await Promise.all([
    getAvailableCards(supabase),
    user ? getCartQuantitiesByCardId(supabase, user.id) : Promise.resolve({}),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="mt-1 text-sm text-muted">
          All available singles — pickup in Ottawa or ship anywhere in Canada.
        </p>
      </div>
      <ShopBrowser cards={cards} cartQtyByCardId={cartQtyByCardId} />
    </div>
  );
}
