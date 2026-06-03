import type { CardStatus } from "@/types/database";

/** How long "Just sold" badges stay on shop listing cards. */
export const JUST_SOLD_WINDOW_HOURS = 72;

export function soldAtForStatus(status: CardStatus): string | null {
  return status === "sold" ? new Date().toISOString() : null;
}

export function markCardSoldUpdate(): {
  status: "sold";
  sold_at: string;
} {
  return { status: "sold", sold_at: new Date().toISOString() };
}

export function isJustSoldCard(
  card: { status: string; sold_at?: string | null },
  windowHours = JUST_SOLD_WINDOW_HOURS,
): boolean {
  if (card.status !== "sold" || !card.sold_at) return false;
  const soldMs = new Date(card.sold_at).getTime();
  if (Number.isNaN(soldMs)) return false;
  return Date.now() - soldMs <= windowHours * 60 * 60 * 1000;
}
