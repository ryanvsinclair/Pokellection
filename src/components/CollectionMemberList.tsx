"use client";

import { useState } from "react";
import { AddCollectionSingleToCartButton } from "@/components/AddCollectionSingleToCartButton";
import { CollectionDetailGallery } from "@/components/CollectionDetailGallery";
import {
  COLLECTION_SINGLE_SURCHARGE_CAD,
  collectionSinglePriceCad,
} from "@/lib/collection-pricing";
import type { Card } from "@/types/database";
import { formatCad, formatCondition } from "@/lib/utils";

interface Props {
  collectionId: string;
  collectionTitle: string;
  cards: Card[];
  cartQtyByCardId: Record<string, number>;
  bundleInCart: boolean;
}

export function CollectionMemberList({
  collectionId,
  collectionTitle,
  cards,
  cartQtyByCardId,
  bundleInCart,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-3">
        <CollectionDetailGallery
          cards={cards}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          title={collectionTitle}
        />
      </div>

      <ul className="space-y-3">
        {cards.map((card, index) => (
          <li key={card.id}>
            <article
              className={`rounded-xl border bg-card p-4 transition ${
                index === selectedIndex ? "border-primary ring-1 ring-primary/30" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="w-full text-left"
              >
                <p className="text-xs text-muted">{card.set_name}</p>
                <h3 className="font-semibold">{card.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-surface-strong px-2 py-0.5">
                    {formatCondition(card.condition)}
                  </span>
                  {card.rarity && (
                    <span className="rounded-full bg-surface-strong px-2 py-0.5">
                      {card.rarity}
                    </span>
                  )}
                  {card.card_number && (
                    <span className="rounded-full bg-surface-strong px-2 py-0.5">
                      {card.card_number}
                    </span>
                  )}
                </div>
                {card.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
                    {card.description}
                  </p>
                )}
              </button>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div>
                  <p className="text-lg font-bold text-primary">
                    {formatCad(collectionSinglePriceCad(card.price_cad))}
                  </p>
                  <p className="text-xs text-muted">
                    List {formatCad(card.price_cad)} + {formatCad(COLLECTION_SINGLE_SURCHARGE_CAD)}{" "}
                    collection fee
                  </p>
                </div>
                <AddCollectionSingleToCartButton
                  cardId={card.id}
                  collectionId={collectionId}
                  cartQuantity={cartQtyByCardId[card.id] ?? 0}
                  bundleInCart={bundleInCart}
                />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
