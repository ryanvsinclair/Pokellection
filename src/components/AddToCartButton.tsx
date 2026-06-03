"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { addToCartAction, type AddToCartResult } from "@/app/cart/actions";
import { buyerSignupPath } from "@/lib/buyer-auth-paths";
import { useCartCount } from "@/components/CartCountProvider";
import { canIncreaseCartQuantity } from "@/lib/cart-inventory";

interface Props {
  cardId: string;
  stockQuantity: number;
  cartQuantity?: number;
  variant?: "default" | "icon";
  /** When false, show sign-up instead of add-to-cart (guest browsing). */
  canPurchase?: boolean;
}

const initialState: AddToCartResult | null = null;

export function AddToCartButton({
  cardId,
  stockQuantity,
  cartQuantity = 0,
  variant = "default",
  canPurchase = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { setCount } = useCartCount();
  const [state, formAction] = useActionState(addToCartAction, initialState);
  const [added, setAdded] = useState(false);
  const [inCart, setInCart] = useState(cartQuantity);

  useEffect(() => {
    setInCart(cartQuantity);
  }, [cartQuantity]);

  const atMax = !canIncreaseCartQuantity(stockQuantity, inCart);

  useEffect(() => {
    if (!state) return;

    if (!state.ok) {
      if (state.error === "auth") {
        router.push(buyerSignupPath(pathname || "/checkout"));
      }
      if (state.error === "max_quantity" && state.inCartQuantity !== undefined) {
        setInCart(state.inCartQuantity);
      }
      return;
    }

    setInCart(state.lineQuantity);
    setCount(state.count);
    setAdded(true);
    router.refresh();
    const timer = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timer);
  }, [state, setCount, router]);

  const maxTitle =
    stockQuantity === 1
      ? "Only 1 copy available — already in your cart"
      : `All ${stockQuantity} copies are in your cart`;

  if (!canPurchase) {
    const signupHref = buyerSignupPath(pathname || `/shop`);
    if (variant === "icon") {
      return (
        <a
          href={signupHref}
          aria-label="Sign up to purchase"
          title="Sign up to purchase"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/10"
        >
          <PlusIcon />
        </a>
      );
    }
    return (
      <a
        href={signupHref}
        className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary/5 px-5 py-3 text-sm font-semibold text-primary"
      >
        Sign up to purchase
      </a>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="card_id" value={cardId} />
      {variant === "icon" ? (
        <IconSubmitButton added={added} atMax={atMax} maxTitle={maxTitle} />
      ) : (
        <TextSubmitButton added={added} atMax={atMax} maxTitle={maxTitle} />
      )}
    </form>
  );
}

function IconSubmitButton({
  added,
  atMax,
  maxTitle,
}: {
  added: boolean;
  atMax: boolean;
  maxTitle: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || atMax}
      aria-label={atMax ? maxTitle : added ? "Added to cart" : "Add to cart"}
      title={atMax ? maxTitle : added ? "Added to cart" : "Add to cart"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition duration-300 ${
        atMax
          ? "cursor-not-allowed border-border text-muted opacity-50"
          : added
            ? "scale-110 border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-900"
            : "border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white dark:border-teal-400 dark:text-teal-400 dark:hover:bg-teal-400 dark:hover:text-slate-900"
      } ${pending ? "opacity-70" : ""}`}
    >
      <span className="inline-flex">
        {atMax ? <CheckIcon /> : added ? <CheckIcon /> : <PlusIcon />}
      </span>
    </button>
  );
}

function TextSubmitButton({
  added,
  atMax,
  maxTitle,
}: {
  added: boolean;
  atMax: boolean;
  maxTitle: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || atMax}
      title={atMax ? maxTitle : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold transition duration-300 ${
        atMax
          ? "cursor-not-allowed border-border text-muted opacity-60"
          : added
            ? "border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-900"
            : "border-border"
      } ${pending ? "opacity-70" : ""}`}
    >
      {atMax ? (
        "In cart (max)"
      ) : pending ? (
        "Adding…"
      ) : added ? (
        <>
          <CheckIcon size={16} />
          Added
        </>
      ) : (
        "Add to cart"
      )}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="animate-[cart-check_0.35s_ease-out]"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
