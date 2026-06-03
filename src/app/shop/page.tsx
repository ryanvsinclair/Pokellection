import Link from "next/link";
import { CollectionGrid } from "@/components/CollectionGrid";
import { ShopBrowser } from "@/components/ShopBrowser";
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

  const featuredCollections = collections.slice(0, 4);
  const { cardCounts, previewImages } = await getCollectionListingMeta(
    supabase,
    featuredCollections.map((c) => c.id),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="mt-1 text-sm text-muted">
          Singles and curated collections — pickup in Ottawa or ship anywhere in Canada.
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

      {collections.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Collections</h2>
            <Link href="/collections" className="text-sm font-medium text-primary">
              View all
            </Link>
          </div>
          <CollectionGrid
            collections={featuredCollections}
            cardCounts={cardCounts}
            previewImages={previewImages}
          />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Singles</h2>
        <ShopBrowser
          cards={cards}
          justSoldCards={justSoldCards}
          cartQtyByCardId={cartQtyByCardId}
          canPurchase={canPurchase}
        />
      </section>
    </div>
  );
}
