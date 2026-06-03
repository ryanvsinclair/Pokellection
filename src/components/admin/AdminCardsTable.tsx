"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { deleteCard, setCardStatus } from "@/app/admin/cards/actions";
import { CardAdminStatusCell } from "@/components/admin/CardAdminStatusCell";
import {
  AdminIconButton,
  AdminIconLink,
  IconEyeOff,
  IconPencil,
  IconReceipt,
  IconTrash,
} from "@/components/admin/AdminActionIcons";
import { CardQuickPhotoButton } from "@/components/admin/CardQuickPhotoButton";
import { CardLanguageBadge } from "@/components/CardLanguageBadge";
import { searchCards } from "@/lib/shop-catalog";
import type { Card } from "@/types/database";
import { formatCad, getPhotoUrl } from "@/lib/utils";

interface Props {
  cards: Card[];
  collectionTitlesByCardId: Map<string, string[]>;
  pendingReservationCardIds: Set<string>;
}

export function AdminCardsTable({
  cards,
  collectionTitlesByCardId,
  pendingReservationCardIds,
}: Props) {
  const [query, setQuery] = useState("");

  const visibleCards = useMemo(() => searchCards(cards, query), [cards, query]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Search cards</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, set, number, rarity, or printing…"
          className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 placeholder:text-muted focus:ring-2"
        />
      </label>

      {query.trim() && (
        <p className="text-sm text-muted">
          {visibleCards.length} of {cards.length} cards
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="w-12 px-2 py-3 font-medium">
                <span className="sr-only">Photo</span>
              </th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Lang</th>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCards.map((card) => (
              <tr key={card.id} className="border-t border-border">
                <td className="px-2 py-2">
                  <div className="relative h-12 w-9 overflow-hidden rounded border border-border bg-surface-strong">
                    {card.photo_paths?.[0] ? (
                      <Image
                        src={getPhotoUrl(card.photo_paths[0])}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-muted">
                        —
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{card.title}</td>
                <td className="px-4 py-3">
                  {card.language === "english" ? (
                    <span className="text-xs text-muted">EN</span>
                  ) : (
                    <CardLanguageBadge language={card.language} />
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {card.card_number ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted">{card.set_name ?? "—"}</td>
                <td className="px-4 py-3">{formatCad(card.price_cad)}</td>
                <td className="px-4 py-3">
                  <CardAdminStatusCell
                    card={card}
                    collectionTitlesByCardId={collectionTitlesByCardId}
                    pendingReservationCardIds={pendingReservationCardIds}
                  />
                </td>
                <td className="px-4 py-3">{card.quantity}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <CardQuickPhotoButton
                      cardId={card.id}
                      cardSlug={card.slug}
                      photoCount={card.photo_paths?.length ?? 0}
                    />
                    <AdminIconLink
                      href={`/admin/cards/${card.id}/edit`}
                      label="Edit listing"
                    >
                      <IconPencil />
                    </AdminIconLink>
                    {card.status !== "sold" && (
                      <AdminIconLink
                        href="/admin/sales"
                        label="Record sale"
                        className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
                      >
                        <IconReceipt />
                      </AdminIconLink>
                    )}
                    {card.status !== "draft" && (
                      <form action={setCardStatus} className="inline">
                        <input type="hidden" name="card_id" value={card.id} />
                        <input type="hidden" name="status" value="draft" />
                        <AdminIconButton label="Unlist" type="submit">
                          <IconEyeOff />
                        </AdminIconButton>
                      </form>
                    )}
                    <form action={deleteCard} className="inline">
                      <input type="hidden" name="card_id" value={card.id} />
                      <AdminIconButton
                        label="Delete listing"
                        type="submit"
                        className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                      >
                        <IconTrash />
                      </AdminIconButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {visibleCards.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  {cards.length === 0
                    ? "No cards yet. Add your first card or import a CSV."
                    : "No cards match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
