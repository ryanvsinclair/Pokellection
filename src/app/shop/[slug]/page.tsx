import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { SignUpToBuy } from "@/components/SignUpToBuy";
import { canPurchaseAsBuyer } from "@/lib/auth-roles";
import { getAvailableCardBySlug } from "@/lib/queries/cards";
import { getPublishedCollectionSlugForCard } from "@/lib/queries/collections";
import { getCartQuantitiesByCardId } from "@/lib/queries/cart";
import { createClient } from "@/lib/supabase/server";
import { formatCad, getPhotoUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: card } = await supabase
    .from("cards")
    .select("title")
    .eq("slug", slug)
    .single();

  return { title: card?.title ?? "Card" };
}

export default async function CardDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const card = await getAvailableCardBySlug(supabase, slug);

  if (!card) {
    const { data: reserved } = await supabase
      .from("cards")
      .select("id")
      .eq("slug", slug)
      .eq("status", "reserved")
      .maybeSingle();

    if (reserved) {
      const collectionSlug = await getPublishedCollectionSlugForCard(supabase, reserved.id);
      if (collectionSlug) redirect(`/collections/${collectionSlug}`);
    }

    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cartQtyByCardId = user
    ? await getCartQuantitiesByCardId(supabase, user.id)
    : {};
  const cartQuantity = cartQtyByCardId[card.id] ?? 0;
  const canPurchase = await canPurchaseAsBuyer(supabase, user?.id);
  const purchaseReturn = `/shop/${card.slug}`;

  const photo = card.photo_paths[0];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-strong">
        {photo ? (
          <Image
            src={getPhotoUrl(photo)}
            alt={card.title}
            width={600}
            height={800}
            className="h-full w-full object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No photo
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted">{card.set_name}</p>
          <h1 className="text-2xl font-bold">{card.title}</h1>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-surface-strong px-3 py-1">{card.condition}</span>
          {card.rarity && (
            <span className="rounded-full bg-surface-strong px-3 py-1">{card.rarity}</span>
          )}
          {card.card_number && (
            <span className="rounded-full bg-surface-strong px-3 py-1">{card.card_number}</span>
          )}
        </div>

        <p className="text-3xl font-bold text-primary">{formatCad(card.price_cad)}</p>

        {card.description && (
          <p className="text-sm leading-relaxed text-muted">{card.description}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canPurchase ? (
            <>
              <Link
                href={`/reserve/${card.id}`}
                className="rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-white"
              >
                Reserve for pickup
              </Link>
              <AddToCartButton
                cardId={card.id}
                stockQuantity={card.quantity}
                cartQuantity={cartQuantity}
                canPurchase
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
        {!canPurchase && (
          <p className="text-sm text-muted">
            Create a free account to reserve, add to cart, or check out.
          </p>
        )}
      </div>
    </div>
  );
}
