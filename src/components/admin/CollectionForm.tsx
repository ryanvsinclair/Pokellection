import Link from "next/link";
import {
  deleteCollection,
  publishCollection,
  saveCollection,
  unpublishCollection,
} from "@/app/admin/collections/actions";
import { CollectionCardPicker } from "@/components/admin/CollectionCardPicker";
import type { CollectionWithCards } from "@/lib/queries/collections";
import type { Card } from "@/types/database";

interface Props {
  collection?: CollectionWithCards;
  selectableCards: Card[];
  lockedInOtherCollections: Set<string>;
  error?: string;
  createAction?: (formData: FormData) => Promise<void>;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_title: "Title is required.",
  create_failed: "Could not create collection.",
  no_cards: "Add at least one card before publishing.",
  cards_unavailable: "All cards must be available (not already reserved or sold).",
  published_locked: "Unpublish to draft before editing cards or details.",
};

export function CollectionForm({
  collection,
  selectableCards,
  lockedInOtherCollections,
  error,
  createAction,
}: Props) {
  const isEdit = Boolean(collection);
  const isDraft = !collection || collection.status === "draft";
  const selectedIds = new Set(collection?.cards.map((row) => row.card_id) ?? []);

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {ERROR_MESSAGES[error] ?? decodeURIComponent(error)}
        </p>
      )}

      <form
        action={isEdit ? saveCollection : createAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        {collection && <input type="hidden" name="collection_id" value={collection.id} />}

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Title</span>
          <input
            name="title"
            required
            defaultValue={collection?.title ?? ""}
            readOnly={!isDraft}
            className="w-full rounded-lg border border-border px-3 py-2 read-only:bg-surface"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Bundle price (CAD)</span>
          <input
            name="price_cad"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={collection?.price_cad ?? ""}
            readOnly={!isDraft}
            className="w-full rounded-lg border border-border px-3 py-2 read-only:bg-surface"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={collection?.description ?? ""}
            readOnly={!isDraft}
            className="w-full rounded-lg border border-border px-3 py-2 read-only:bg-surface"
          />
        </label>

        {isEdit && (
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Status</span>
            <select
              name="status"
              defaultValue={collection?.status ?? "draft"}
              disabled={!isDraft}
              className="w-full rounded-lg border border-border px-3 py-2 disabled:bg-surface"
            >
              <option value="draft">Draft</option>
              <option value="available">Published</option>
              <option value="sold">Sold</option>
            </select>
          </label>
        )}

        <CollectionCardPicker
          cards={selectableCards}
          selectedIds={selectedIds}
          lockedInOtherCollections={lockedInOtherCollections}
          disabled={!isDraft}
        />

        {isDraft && (
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {isEdit ? "Save collection" : "Create collection"}
          </button>
        )}
      </form>

      {collection && (
        <div className="flex flex-wrap gap-2">
          {collection.status === "draft" && (
            <form action={publishCollection}>
              <input type="hidden" name="collection_id" value={collection.id} />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Publish collection
              </button>
            </form>
          )}
          {collection.status === "available" && (
            <form action={unpublishCollection}>
              <input type="hidden" name="collection_id" value={collection.id} />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
              >
                Unpublish to draft
              </button>
            </form>
          )}
          {collection.status !== "sold" && (
            <form action={deleteCollection}>
              <input type="hidden" name="collection_id" value={collection.id} />
              <button
                type="submit"
                className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
              >
                Delete
              </button>
            </form>
          )}
          <Link href="/admin/collections" className="rounded-lg px-4 py-2 text-sm text-muted">
            Back to list
          </Link>
        </div>
      )}
    </div>
  );
}
