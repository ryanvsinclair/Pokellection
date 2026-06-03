"use client";

import Link from "next/link";
import { useCartCount } from "@/components/CartCountProvider";

interface Props {
  className?: string;
  showLabel?: boolean;
  href?: string;
}

export function CartNavLink({ className, showLabel = true, href = "/checkout" }: Props) {
  const { count } = useCartCount();

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-1.5 ${className ?? ""}`}
    >
      <span className="relative inline-flex">
        <CartIcon />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-2 -top-2 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {showLabel && <span>Cart</span>}
      {count > 0 && (
        <span className="sr-only">
          , {count} {count === 1 ? "item" : "items"}
        </span>
      )}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
