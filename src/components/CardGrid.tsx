import Link from "next/link";
import Image from "next/image";
import type { Card } from "@/types/database";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatCad, formatCondition, getPhotoUrl } from "@/lib/utils";

interface CardGridProps {
  cards: Card[];
  emptyMessage?: string;
}

export function CardGrid({ cards, emptyMessage = "No cards available right now." }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => {
        const photo = card.photo_paths[0];
        const meta = [card.rarity, card.card_number].filter(Boolean).join(" • ");
        return (
          <div
            key={card.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm transition hover:shadow-md"
          >
            <Link href={`/shop/${card.slug}`} className="group block p-3 pb-0">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-strong">
                {photo ? (
                  <Image
                    src={getPhotoUrl(photo)}
                    alt={card.title}
                    fill
                    className="object-contain transition group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No photo
                  </div>
                )}
              </div>
            </Link>

            <div className="flex flex-1 flex-col gap-1 p-3">
              <Link href={`/shop/${card.slug}`} className="hover:underline">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug">{card.title}</h3>
              </Link>

              {card.set_name && (
                <p className="line-clamp-1 text-xs text-muted underline decoration-border underline-offset-2">
                  {card.set_name}
                </p>
              )}

              {meta && <p className="text-xs text-muted">{meta}</p>}

              <p className="text-xs text-amber-600 dark:text-amber-400">
                {formatCondition(card.condition)}
                {card.printing ? ` • ${card.printing}` : ""}
              </p>

              <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                <div>
                  <p className="text-lg font-bold text-primary">{formatCad(card.price_cad)}</p>
                  <p className="text-xs text-teal-600 dark:text-teal-400">Qty: {card.quantity}</p>
                </div>
                <AddToCartButton cardId={card.id} variant="icon" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
