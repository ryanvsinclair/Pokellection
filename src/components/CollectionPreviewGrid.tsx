import Image from "next/image";
import type { CollectionPreviewImage } from "@/lib/collection-photos";

const SLOT_COUNT = 4;

interface Props {
  images: CollectionPreviewImage[];
  title: string;
}

/** Compact row of up to four preview thumbs for collection listing cards. */
export function CollectionPreviewGrid({ images, title }: Props) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => images[index] ?? null);

  return (
    <div
      className="grid grid-cols-4 gap-1"
      aria-label={`${title} preview photos`}
    >
      {slots.map((image, index) => (
        <div
          key={index}
          className="relative h-16 overflow-hidden rounded-md border border-border bg-surface-strong sm:h-20"
        >
          {image?.src ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-contain p-0.5"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted">
              —
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
