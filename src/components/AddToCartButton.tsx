import { addToCart } from "@/app/cart/actions";

interface Props {
  cardId: string;
  variant?: "default" | "icon";
}

export function AddToCartButton({ cardId, variant = "default" }: Props) {
  return (
    <form action={addToCart}>
      <input type="hidden" name="card_id" value={cardId} />
      {variant === "icon" ? (
        <button
          type="submit"
          aria-label="Add to cart"
          title="Add to cart"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-400 text-teal-400 transition hover:bg-teal-400 hover:text-slate-900"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      ) : (
        <button
          type="submit"
          className="rounded-lg border border-border px-5 py-3 text-sm font-semibold"
        >
          Add to cart
        </button>
      )}
    </form>
  );
}
