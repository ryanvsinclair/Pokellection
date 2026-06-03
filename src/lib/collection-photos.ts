import type { Card } from "@/types/database";
import { getPhotoUrl } from "@/lib/utils";

export interface CollectionPreviewImage {
  src: string;
  alt: string;
}

const PREVIEW_IMAGE_LIMIT = 4;

function firstPhotoPath(card: Card | null | undefined): string | undefined {
  return card?.photo_paths?.[0];
}

/** Up to four preview images for listing cards (first photo per member card). */
export function buildCollectionPreviewImages(
  cards: (Card | null | undefined)[],
  max = PREVIEW_IMAGE_LIMIT,
): CollectionPreviewImage[] {
  return cards
    .filter((card): card is Card => card != null)
    .slice(0, max)
    .map((card) => {
      const path = firstPhotoPath(card);
      return {
        src: path ? getPhotoUrl(path) : "",
        alt: card.title,
      };
    });
}

export type CollectionGalleryImage = CollectionPreviewImage;

/** One gallery slide per card (first photo), in collection sort order. */
export function buildCollectionGalleryImages(
  cards: (Card | null | undefined)[],
): CollectionGalleryImage[] {
  return cards
    .filter((card): card is Card => card != null)
    .map((card) => {
      const path = firstPhotoPath(card);
      if (!path) return null;
      return { src: getPhotoUrl(path), alt: card.title };
    })
    .filter((item): item is CollectionGalleryImage => item !== null);
}
