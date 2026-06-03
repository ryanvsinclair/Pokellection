"use client";

import Image from "next/image";
import { useState } from "react";
import { getPhotoUrl } from "@/lib/utils";

interface Props {
  photos: string[];
  title: string;
}

export function CardListingGallery({ photos, title }: Props) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(Math.max(0, index), Math.max(0, photos.length - 1));
  const photo = photos[safeIndex];

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-border bg-surface-strong text-sm text-muted">
        No photo
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-strong">
        <Image
          src={getPhotoUrl(photo)}
          alt={`${title} — photo ${safeIndex + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={safeIndex === 0}
        />
      </div>

      {photos.length > 1 && (
        <>
          <div className="flex items-center justify-between gap-2 text-sm text-muted">
            <button
              type="button"
              disabled={safeIndex <= 0}
              onClick={() => setIndex((i) => i - 1)}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              {safeIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              disabled={safeIndex >= photos.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((path, thumbIndex) => (
              <button
                key={path}
                type="button"
                onClick={() => setIndex(thumbIndex)}
                className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-md border-2 transition ${
                  thumbIndex === safeIndex
                    ? "border-primary"
                    : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={getPhotoUrl(path)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
