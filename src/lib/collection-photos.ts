import type { Card } from "@/types/database";
import { getPhotoUrl } from "@/lib/utils";

export interface CollectionPreviewImage {
  src: string;
  alt: string;
}

const PREVIEW_IMAGE_LIMIT = 4;

/** Up to four preview images for listing cards (first photo per member card). */
export function buildCollectionPreviewImages(
  cards: Card[],
  max = PREVIEW_IMAGE_LIMIT,
): CollectionPreviewImage[] {
  return cards.slice(0, max).map((card) => {
    const path = card.photo_paths[0];
    return {
      src: path ? getPhotoUrl(path) : "",
      alt: card.title,
    };
  });
}

export type CollectionGalleryImage = CollectionPreviewImage;

/** One gallery slide per card (first photo), in collection sort order. */
export function buildCollectionGalleryImages(cards: Card[]): CollectionGalleryImage[] {
  return cards
    .map((card) => {
      const path = card.photo_paths[0];
      if (!path) return null;
      return { src: getPhotoUrl(path), alt: card.title };
    })
    .filter((item): item is CollectionGalleryImage => item !== null);
}
