import Link from "next/link";
import { CollectionPreviewGrid } from "@/components/CollectionPreviewGrid";
import type { CollectionPreviewImage } from "@/lib/collection-photos";
import type { Collection } from "@/types/database";
import { formatCad } from "@/lib/utils";

interface Props {
  collections: Collection[];
  cardCounts?: Record<string, number>;
  previewImages?: Record<string, CollectionPreviewImage[]>;
  emptyMessage?: string;
}

export function CollectionGrid({
  collections,
  cardCounts = {},
  previewImages = {},
  emptyMessage = "No collections published yet.",
}: Props) {
  if (collections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={`/collections/${collection.slug}`}
          className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-md"
        >
          <div className="border-b border-border bg-surface-strong/40 p-2">
            <CollectionPreviewGrid
              images={previewImages[collection.id] ?? []}
              title={collection.title}
            />
          </div>
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Collection</p>
            <h3 className="mt-1 text-lg font-bold">{collection.title}</h3>
            {collection.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted">{collection.description}</p>
            )}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-primary">{formatCad(collection.price_cad)}</span>
              <span className="text-muted">{cardCounts[collection.id] ?? "—"} cards</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
