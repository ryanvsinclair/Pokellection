import Link from "next/link";
import { buyerSignupPath } from "@/lib/buyer-auth-paths";

interface Props {
  returnPath: string;
  variant?: "button" | "link" | "compact";
  className?: string;
}

/** Redirects guests to create an account before cart, checkout, or reservations. */
export function SignUpToBuy({ returnPath, variant = "button", className = "" }: Props) {
  const href = buyerSignupPath(returnPath);

  if (variant === "link") {
    return (
      <Link href={href} className={`text-sm font-medium text-primary underline-offset-2 hover:underline ${className}`}>
        Sign up to purchase
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        title="Sign up to purchase"
        aria-label="Sign up to purchase"
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/10 ${className}`}
      >
        <UserPlusIcon />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-lg border border-primary bg-primary/5 px-5 py-3 text-center text-sm font-semibold text-primary transition hover:bg-primary/10 ${className}`}
    >
      Sign up to purchase
    </Link>
  );
}

function UserPlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
