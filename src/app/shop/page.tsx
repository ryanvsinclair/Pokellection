import Link from "next/link";
import { ShopCatalogView } from "@/components/ShopCatalogView";
import { getAvailableCards, getJustSoldCards } from "@/lib/queries/cards";
import { getCartQuantitiesByCardId } from "@/lib/queries/cart";
import {
  getAvailableCollections,
  getCollectionListingMeta,
} from "@/lib/queries/collections";
import { canPurchaseAsBuyer } from "@/lib/auth-roles";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [cards, justSoldCards, collections, cartQtyByCardId] = await Promise.all([
    getAvailableCards(supabase),
    getJustSoldCards(supabase),
    getAvailableCollections(supabase),
    user ? getCartQuantitiesByCardId(supabase, user.id) : Promise.resolve({}),
  ]);

  const canPurchase = await canPurchaseAsBuyer(supabase, user?.id);

  const { cardCounts, previewImages } = await getCollectionListingMeta(
    supabase,
    collections.map((c) => c.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="mt-1 text-sm text-muted">
          Browse singles or curated collections — pickup in Ottawa or ship anywhere in Canada.
          {!canPurchase && (
            <>
              {" "}
              <Link href="/account/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>{" "}
              to reserve, add to cart, or check out.
            </>
          )}
        </p>
      </div>

      <ShopCatalogView
        cards={cards}
        justSoldCards={justSoldCards}
        cartQtyByCardId={cartQtyByCardId}
        canPurchase={canPurchase}
        collections={collections}
        cardCounts={cardCounts}
        previewImages={previewImages}
      />
    </div>
  );
}
