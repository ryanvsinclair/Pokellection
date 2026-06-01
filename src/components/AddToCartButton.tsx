import { addToCart } from "@/app/cart/actions";

interface Props {
  cardId: string;
}

export function AddToCartButton({ cardId }: Props) {
  return (
    <form action={addToCart}>
      <input type="hidden" name="card_id" value={cardId} />
      <button
        type="submit"
        className="rounded-lg border border-border px-5 py-3 text-sm font-semibold"
      >
        Add to cart
      </button>
    </form>
  );
}
