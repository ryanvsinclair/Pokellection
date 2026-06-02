/** How many more units of a card can be added to the cart. */
export function remainingCartCapacity(
  stockQuantity: number,
  inCartQuantity: number,
): number {
  return Math.max(0, stockQuantity - inCartQuantity);
}

export function canIncreaseCartQuantity(
  stockQuantity: number,
  inCartQuantity: number,
  delta = 1,
): boolean {
  return remainingCartCapacity(stockQuantity, inCartQuantity) >= delta;
}
