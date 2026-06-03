import type { Card } from "@/types/database";

export type CardAdminStatus =
  | { kind: "available" | "draft" | "sold" }
  | { kind: "in_collection"; collections: string[] }
  | { kind: "pickup_hold" }
  | { kind: "reserved_unassigned" };

export function resolveCardAdminStatus(
  card: Pick<Card, "id" | "status">,
  collectionTitlesByCardId: Map<string, string[]>,
  pendingReservationCardIds: Set<string>,
): CardAdminStatus {
  if (card.status === "available") return { kind: "available" };
  if (card.status === "draft") return { kind: "draft" };
  if (card.status === "sold") return { kind: "sold" };

  const collections = collectionTitlesByCardId.get(card.id) ?? [];
  const pickupHold = pendingReservationCardIds.has(card.id);

  if (collections.length > 0) {
    return { kind: "in_collection", collections };
  }
  if (pickupHold) {
    return { kind: "pickup_hold" };
  }
  if (card.status === "reserved") {
    return { kind: "reserved_unassigned" };
  }

  return { kind: "draft" };
}

export function formatCardAdminStatus(status: CardAdminStatus): string {
  switch (status.kind) {
    case "available":
      return "Available";
    case "draft":
      return "Draft";
    case "sold":
      return "Sold";
    case "in_collection":
      return "In collection";
    case "pickup_hold":
      return "Pickup hold";
    case "reserved_unassigned":
      return "Reserved";
  }
}
