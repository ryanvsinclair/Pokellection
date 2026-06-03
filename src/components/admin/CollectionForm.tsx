import Link from "next/link";
import {
  deleteCollection,
  publishCollection,
  saveCollection,
  unpublishCollection,
} from "@/app/admin/collections/actions";
import type { CollectionWithCards } from "@/lib/queries/collections";
import type { Card } from "@/types/database";
import { formatCad } from "@/lib/utils";

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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Cards in this collection</legend>
          <p className="text-xs text-muted">
            Order follows your selection top to bottom. Only available singles can be added.
          </p>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {selectableCards.length === 0 ? (
              <p className="text-sm text-muted">No available cards to add.</p>
            ) : (
              selectableCards.map((card) => {
                const locked =
                  lockedInOtherCollections.has(card.id) && !selectedIds.has(card.id);
                return (
                  <label
                    key={card.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface ${
                      locked ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="card_ids"
                      value={card.id}
                      defaultChecked={selectedIds.has(card.id)}
                      disabled={!isDraft || locked}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">{card.title}</span>
                      <span className="block text-xs text-muted">
                        {formatCad(card.price_cad)}
                        {card.set_name ? ` · ${card.set_name}` : ""}
                        {locked ? " · In another collection" : ""}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>

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
