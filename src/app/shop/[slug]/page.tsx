import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
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
  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", slug)
    .eq("status", "available")
    .single();

  if (!card) notFound();

  const photo = card.photo_paths[0];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-slate-100">
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
          <span className="rounded-full bg-slate-100 px-3 py-1">{card.condition}</span>
          {card.rarity && (
            <span className="rounded-full bg-slate-100 px-3 py-1">{card.rarity}</span>
          )}
          {card.card_number && (
            <span className="rounded-full bg-slate-100 px-3 py-1">{card.card_number}</span>
          )}
        </div>

        <p className="text-3xl font-bold text-red-600">{formatCad(card.price_cad)}</p>

        {card.description && (
          <p className="text-sm leading-relaxed text-muted">{card.description}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/reserve/${card.id}`}
            className="rounded-lg bg-red-600 px-5 py-3 text-center text-sm font-semibold text-white"
          >
            Reserve for pickup
          </Link>
          <AddToCartButton cardId={card.id} />
          <Link
            href="/checkout"
            className="rounded-lg bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white"
          >
            Go to checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
