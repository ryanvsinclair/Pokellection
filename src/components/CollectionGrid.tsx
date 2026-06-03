import Link from "next/link";
import type { Collection } from "@/types/database";
import { formatCad } from "@/lib/utils";

interface Props {
  collections: Collection[];
  cardCounts?: Record<string, number>;
  emptyMessage?: string;
}

export function CollectionGrid({
  collections,
  cardCounts = {},
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
    <div className="grid gap-3 sm:grid-cols-2">
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={`/collections/${collection.slug}`}
          className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Collection</p>
          <h3 className="mt-1 text-lg font-bold">{collection.title}</h3>
          {collection.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{collection.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-primary">{formatCad(collection.price_cad)}</span>
            <span className="text-muted">
              {cardCounts[collection.id] ?? "—"} cards
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
