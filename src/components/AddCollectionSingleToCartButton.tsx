"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addCollectionSingleToCartAction,
  type AddCollectionSingleToCartResult,
} from "@/app/cart/actions";
import { useCartCount } from "@/components/CartCountProvider";

interface Props {
  cardId: string;
  collectionId: string;
  cartQuantity?: number;
  bundleInCart?: boolean;
}

const initialState: AddCollectionSingleToCartResult | null = null;

export function AddCollectionSingleToCartButton({
  cardId,
  collectionId,
  cartQuantity = 0,
  bundleInCart = false,
}: Props) {
  const router = useRouter();
  const { setCount } = useCartCount();
  const [state, formAction] = useActionState(addCollectionSingleToCartAction, initialState);
  const [added, setAdded] = useState(false);
  const inCart = cartQuantity > 0;
  const disabled = bundleInCart || inCart;

  useEffect(() => {
    if (!state) return;

    if (!state.ok) {
      if (state.error === "auth") {
        router.push(`/account/signup?redirect=${encodeURIComponent("/checkout")}`);
      }
      return;
    }

    setCount(state.count);
    setAdded(true);
    router.refresh();
    const timer = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timer);
  }, [state, setCount, router]);

  const title = bundleInCart
    ? "Remove the full collection from your cart to buy singles"
    : inCart
      ? "This card is already in your cart"
      : undefined;

  return (
    <form action={formAction}>
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="collection_id" value={collectionId} />
      <SubmitButton added={added} disabled={disabled} title={title} bundleInCart={bundleInCart} />
    </form>
  );
}

function SubmitButton({
  added,
  disabled,
  title,
  bundleInCart,
}: {
  added: boolean;
  disabled: boolean;
  title?: string;
  bundleInCart: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={title}
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        disabled
          ? "cursor-not-allowed border-border text-muted opacity-60"
          : added
            ? "border-teal-600 bg-teal-600 text-white"
            : "border-border hover:bg-surface"
      } ${pending ? "opacity-70" : ""}`}
    >
      {bundleInCart
        ? "Bundle in cart"
        : disabled
          ? "In cart"
          : pending
            ? "Adding…"
            : added
              ? "Added"
              : "Buy this card"}
    </button>
  );
}
