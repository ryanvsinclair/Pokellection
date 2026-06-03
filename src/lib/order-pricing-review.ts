import type { Order } from "@/types/database";

export type OrderPricingReviewFields = Pick<
  Order,
  | "fulfillment_option"
  | "pricing_review_requested_at"
  | "pricing_review_resolved_at"
>;

const PRICING_REVIEW_MESSAGE_MAX = 2000;

export function normalizePricingReviewMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, PRICING_REVIEW_MESSAGE_MAX);
}

/** Canada ship orders with an open buyer pricing review (e-transfer held). */
export function orderHasOpenPricingReview(order: OrderPricingReviewFields): boolean {
  if (order.fulfillment_option !== "canada_ship") return false;
  if (!order.pricing_review_requested_at) return false;
  return !order.pricing_review_resolved_at;
}

export function orderPricingReviewBlocksEtransfer(
  order: OrderPricingReviewFields,
): boolean {
  return orderHasOpenPricingReview(order);
}
