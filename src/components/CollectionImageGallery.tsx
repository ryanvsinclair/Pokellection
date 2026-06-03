"use client";

import Image from "next/image";
import { useState } from "react";

const PAGE_SIZE = 4;

export interface CollectionGalleryImage {
  src: string;
  alt: string;
}

interface Props {
  images: CollectionGalleryImage[];
  title: string;
}

export function CollectionImageGallery({ images, title }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visible = images.slice(start, start + PAGE_SIZE);
  const slots = Array.from({ length: PAGE_SIZE }, (_, i) => visible[i] ?? null);
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {slots.map((image, index) => (
          <div
            key={`${page}-${index}`}
            className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-surface-strong"
          >
            {image ? (
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 45vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                —
              </div>
            )}
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!canPrev}
            aria-label="Previous cards"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronIcon direction="left" />
          </button>
          <p className="text-muted">
            Cards {start + 1}–{Math.min(start + PAGE_SIZE, images.length)} of {images.length}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={!canNext}
            aria-label="Next cards"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      )}

      {images.length === 0 && (
        <p className="text-center text-sm text-muted">No photos in this collection yet.</p>
      )}

      <p className="sr-only">
        {title} — image gallery page {page + 1} of {pageCount}
      </p>
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
