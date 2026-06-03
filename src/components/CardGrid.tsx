import Link from "next/link";
import Image from "next/image";
import type { Card } from "@/types/database";
import { AddToCartButton } from "@/components/AddToCartButton";
import { isJustSoldCard } from "@/lib/card-sold";
import { formatCad, formatCondition, getPhotoUrl } from "@/lib/utils";

interface CardGridProps {
  cards: Card[];
  cartQtyByCardId?: Record<string, number>;
  emptyMessage?: string;
}

export function CardGrid({
  cards,
  cartQtyByCardId = {},
  emptyMessage = "No cards available right now.",
}: CardGridProps) {
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
        const justSold = isJustSoldCard(card);

        return (
          <div
            key={card.id}
            className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm transition hover:shadow-md ${
              justSold ? "opacity-90" : ""
            }`}
          >
            <Link
              href={justSold ? "#" : `/shop/${card.slug}`}
              className={`group block p-3 pb-0 ${justSold ? "pointer-events-none" : ""}`}
              aria-disabled={justSold}
              tabIndex={justSold ? -1 : undefined}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-strong">
                {photo ? (
                  <Image
                    src={getPhotoUrl(photo)}
                    alt={card.title}
                    fill
                    className={`object-contain transition ${
                      justSold ? "grayscale-[0.35]" : "group-hover:scale-[1.02]"
                    }`}
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No photo
                  </div>
                )}
                {justSold && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded-full bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground shadow-md">
                      Just sold
                    </span>
                  </div>
                )}
              </div>
            </Link>

            <div className="flex flex-1 flex-col gap-1 p-3">
              {justSold ? (
                <h3 className="line-clamp-2 text-sm font-bold leading-snug">{card.title}</h3>
              ) : (
                <Link href={`/shop/${card.slug}`} className="hover:underline">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug">{card.title}</h3>
                </Link>
              )}

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
                  <p
                    className={`text-lg font-bold ${justSold ? "text-muted line-through" : "text-primary"}`}
                  >
                    {formatCad(card.price_cad)}
                  </p>
                  {!justSold && (
                    <p className="text-xs text-teal-600 dark:text-teal-400">
                      Qty: {card.quantity}
                    </p>
                  )}
                </div>
                {!justSold && (
                  <AddToCartButton
                    cardId={card.id}
                    stockQuantity={card.quantity}
                    cartQuantity={cartQtyByCardId[card.id] ?? 0}
                    variant="icon"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
