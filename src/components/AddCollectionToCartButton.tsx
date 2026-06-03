"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addCollectionToCartAction,
  type AddCollectionToCartResult,
} from "@/app/cart/actions";
import { useCartCount } from "@/components/CartCountProvider";
import { SignUpToBuy } from "@/components/SignUpToBuy";
import { buyerSignupPath } from "@/lib/buyer-auth-paths";

interface Props {
  collectionId: string;
  singlesInCart?: boolean;
  canPurchase?: boolean;
  returnPath?: string;
}

const initialState: AddCollectionToCartResult | null = null;

export function AddCollectionToCartButton({
  collectionId,
  singlesInCart = false,
  canPurchase = true,
  returnPath,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const signupReturn = returnPath ?? pathname ?? "/checkout";
  const { setCount } = useCartCount();
  const [state, formAction] = useActionState(addCollectionToCartAction, initialState);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!state) return;

    if (!state.ok) {
      if (state.error === "auth") {
        router.push(buyerSignupPath(signupReturn));
      }
      return;
    }

    setCount(state.count);
    setAdded(true);
    router.refresh();
    const timer = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timer);
  }, [state, setCount, router]);

  if (!canPurchase) {
    return <SignUpToBuy returnPath={signupReturn} />;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="collection_id" value={collectionId} />
      <SubmitButton added={added} disabled={singlesInCart} />
    </form>
  );
}

function SubmitButton({ added, disabled }: { added: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={disabled ? "Remove collection singles from your cart to add the full bundle" : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold transition duration-300 ${
        added
          ? "border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-900"
          : "border-border"
      } ${pending ? "opacity-70" : ""}`}
    >
      {disabled
        ? "Singles in cart"
        : pending
          ? "Adding…"
          : added
            ? "Added to cart"
            : "Add collection to cart"}
    </button>
  );
}
