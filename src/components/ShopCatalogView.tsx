"use client";

import { useState } from "react";
import { CollectionGrid } from "@/components/CollectionGrid";
import { ShopBrowser } from "@/components/ShopBrowser";
import type { CollectionPreviewImage } from "@/lib/collection-photos";
import type { Card, Collection } from "@/types/database";

type ShopView = "singles" | "collections";

interface Props {
  cards: Card[];
  justSoldCards: Card[];
  cartQtyByCardId: Record<string, number>;
  canPurchase: boolean;
  collections: Collection[];
  cardCounts: Record<string, number>;
  previewImages: Record<string, CollectionPreviewImage[]>;
}

export function ShopCatalogView({
  cards,
  justSoldCards,
  cartQtyByCardId,
  canPurchase,
  collections,
  cardCounts,
  previewImages,
}: Props) {
  const [view, setView] = useState<ShopView>("singles");
  const hasCollections = collections.length > 0;

  return (
    <div className="space-y-6">
      {hasCollections && (
        <div
          className="inline-flex rounded-lg border border-border bg-surface p-1"
          role="tablist"
          aria-label="Shop catalog view"
        >
          <ViewTab
            active={view === "singles"}
            onClick={() => setView("singles")}
            label="Singles"
          />
          <ViewTab
            active={view === "collections"}
            onClick={() => setView("collections")}
            label="Collections"
          />
        </div>
      )}

      {view === "singles" || !hasCollections ? (
        <section className="space-y-4" aria-label="Singles">
          <ShopBrowser
            cards={cards}
            justSoldCards={justSoldCards}
            cartQtyByCardId={cartQtyByCardId}
            canPurchase={canPurchase}
          />
        </section>
      ) : (
        <section className="space-y-4" aria-label="Collections">
          <p className="text-sm text-muted">Curated bundles of cards at a set price.</p>
          <CollectionGrid
            collections={collections}
            cardCounts={cardCounts}
            previewImages={previewImages}
            emptyMessage="No collections available right now."
          />
        </section>
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
