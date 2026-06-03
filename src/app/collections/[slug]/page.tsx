import Link from "next/link";
import { notFound } from "next/navigation";
import { AddCollectionToCartButton } from "@/components/AddCollectionToCartButton";
import { CollectionMemberList } from "@/components/CollectionMemberList";
import { getAvailableCollectionBySlug } from "@/lib/queries/collections";
import { getCartQuantitiesByCardId } from "@/lib/queries/cart";
import { SignUpToBuy } from "@/components/SignUpToBuy";
import { canPurchaseAsBuyer } from "@/lib/auth-roles";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";
import { COLLECTION_SINGLE_SURCHARGE_CAD } from "@/lib/collection-pricing";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("title")
    .eq("slug", slug)
    .eq("status", "available")
    .maybeSingle();

  return { title: data?.title ?? "Collection" };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const collection = await getAvailableCollectionBySlug(supabase, slug);

  if (!collection) notFound();

  const cards = collection.cards.map((row) => row.card);
  if (cards.length === 0) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cartQtyByCardId = user
    ? await getCartQuantitiesByCardId(supabase, user.id)
    : {};

  const canPurchase = await canPurchaseAsBuyer(supabase, user?.id);
  const purchaseReturn = `/collections/${slug}`;

  let bundleInCart = false;
  let singlesInCart = false;
  if (user) {
    const [{ data: bundleLine }, { data: singleLines }] = await Promise.all([
      supabase
        .from("cart_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("collection_id", collection.id)
        .maybeSingle(),
      supabase
        .from("cart_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("from_collection_id", collection.id)
        .limit(1),
    ]);
    bundleInCart = Boolean(bundleLine);
    singlesInCart = Boolean(singleLines?.length);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Collection</p>
        <h1 className="text-2xl font-bold">{collection.title}</h1>
        <p className="text-sm text-muted">
          {cards.length} cards · Bundle {formatCad(collection.price_cad)} · Or buy any single
          with a {formatCad(COLLECTION_SINGLE_SURCHARGE_CAD)} fee
        </p>
        {collection.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{collection.description}</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canPurchase ? (
            <>
              <AddCollectionToCartButton
                collectionId={collection.id}
                singlesInCart={singlesInCart}
                canPurchase
                returnPath={purchaseReturn}
              />
              <Link
                href="/checkout"
                className="rounded-lg bg-foreground px-5 py-3 text-center text-sm font-semibold text-background"
              >
                Go to checkout
              </Link>
            </>
          ) : (
            <SignUpToBuy returnPath={purchaseReturn} />
          )}
        </div>
      </div>

      <CollectionMemberList
        collectionId={collection.id}
        collectionTitle={collection.title}
        cards={cards}
        cartQtyByCardId={cartQtyByCardId}
        bundleInCart={bundleInCart}
        canPurchase={canPurchase}
        returnPath={purchaseReturn}
      />
    </div>
  );
}
