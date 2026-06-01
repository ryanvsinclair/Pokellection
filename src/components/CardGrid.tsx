import Link from "next/link";
import Image from "next/image";
import type { Card } from "@/types/database";
import { formatCad, getPhotoUrl } from "@/lib/utils";

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
        return (
          <Link
            key={card.id}
            href={`/shop/${card.slug}`}
            className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-[3/4] bg-slate-100">
              {photo ? (
                <Image
                  src={getPhotoUrl(photo)}
                  alt={card.title}
                  fill
                  className="object-cover transition group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted">
                  No photo
                </div>
              )}
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{card.title}</p>
              <p className="text-sm font-bold text-red-600">{formatCad(card.price_cad)}</p>
              <p className="text-xs text-muted">{card.condition}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
