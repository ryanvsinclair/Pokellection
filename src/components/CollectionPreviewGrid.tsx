import Image from "next/image";
import type { CollectionPreviewImage } from "@/lib/collection-photos";

const SLOT_COUNT = 4;

interface Props {
  images: CollectionPreviewImage[];
  title: string;
}

/** Static 2×2 preview grid for collection listing cards. */
export function CollectionPreviewGrid({ images, title }: Props) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => images[index] ?? null);

  return (
    <div
      className="grid grid-cols-2 gap-1.5"
      aria-label={`${title} preview photos`}
    >
      {slots.map((image, index) => (
        <div
          key={index}
          className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-surface-strong"
        >
          {image?.src ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 45vw, 200px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              —
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
