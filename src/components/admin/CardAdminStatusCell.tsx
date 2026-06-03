import {
  formatCardAdminStatus,
  resolveCardAdminStatus,
  type CardAdminStatus,
} from "@/lib/card-admin-status";
import type { Card } from "@/types/database";

interface Props {
  card: Card;
  collectionTitlesByCardId: Map<string, string[]>;
  pendingReservationCardIds: Set<string>;
}

function statusClasses(status: CardAdminStatus): string {
  switch (status.kind) {
    case "available":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "sold":
      return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    case "in_collection":
      return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300";
    case "pickup_hold":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "reserved_unassigned":
      return "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200";
  }
}

export function CardAdminStatusCell({
  card,
  collectionTitlesByCardId,
  pendingReservationCardIds,
}: Props) {
  const status = resolveCardAdminStatus(
    card,
    collectionTitlesByCardId,
    pendingReservationCardIds,
  );
  const pickupHold =
    status.kind !== "pickup_hold" && pendingReservationCardIds.has(card.id);
  const inCollection =
    status.kind !== "in_collection" &&
    (collectionTitlesByCardId.get(card.id)?.length ?? 0) > 0;

  return (
    <div className="space-y-1">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(status)}`}
      >
        {formatCardAdminStatus(status)}
      </span>
      {status.kind === "in_collection" && (
        <p className="text-xs text-muted">{status.collections.join(", ")}</p>
      )}
      {pickupHold && status.kind === "in_collection" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">+ pickup hold</p>
      )}
      {inCollection && status.kind === "pickup_hold" && (
        <p className="text-xs text-violet-700 dark:text-violet-300">
          + {collectionTitlesByCardId.get(card.id)?.join(", ")}
        </p>
      )}
    </div>
  );
}
