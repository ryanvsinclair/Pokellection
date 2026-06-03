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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={`/collections/${collection.slug}`}
          className="overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-sm"
        >
          <div className="border-b border-border bg-surface-strong/40 px-2 py-1.5">
            <CollectionPreviewGrid
              images={previewImages[collection.id] ?? []}
              title={collection.title}
            />
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
              Collection
            </p>
            <h3 className="mt-0.5 line-clamp-1 text-sm font-bold">{collection.title}</h3>
            {collection.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">{collection.description}</p>
            )}
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">{formatCad(collection.price_cad)}</span>
              <span className="text-muted">{cardCounts[collection.id] ?? "—"} cards</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
