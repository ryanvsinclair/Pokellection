"use client";

import Image from "next/image";
import type { Card } from "@/types/database";
import { getPhotoUrl } from "@/lib/utils";

interface Props {
  cards: Card[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  title: string;
}

export function CollectionDetailGallery({
  cards,
  selectedIndex,
  onSelectIndex,
  title,
}: Props) {
  const safeIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, cards.length - 1));
  const selected = cards[safeIndex];
  const photo = selected?.photo_paths[0];
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < cards.length - 1;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-strong">
        {photo ? (
          <Image
            src={getPhotoUrl(photo)}
            alt={selected?.title ?? title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={safeIndex === 0}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No photo
          </div>
        )}
      </div>

      {cards.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectIndex(safeIndex - 1)}
            disabled={!canPrev}
            aria-label="Previous card"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronIcon direction="left" />
          </button>
          <p className="text-center text-sm text-muted">
            Card {safeIndex + 1} of {cards.length}
          </p>
          <button
            type="button"
            onClick={() => onSelectIndex(safeIndex + 1)}
            disabled={!canNext}
            aria-label="Next card"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      )}

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label={`${title} card photos`}
      >
        {cards.map((card, index) => {
          const thumb = card.photo_paths[0];
          const isActive = index === safeIndex;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={card.title}
              onClick={() => onSelectIndex(index)}
              className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-md border-2 transition ${
                isActive ? "border-primary" : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              {thumb ? (
                <Image
                  src={getPhotoUrl(thumb)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] text-muted">
                  —
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}
