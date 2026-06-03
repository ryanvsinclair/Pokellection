import type { Card } from "@/types/database";
import type { CollectionGalleryImage } from "@/components/CollectionImageGallery";
import { getPhotoUrl } from "@/lib/utils";

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
