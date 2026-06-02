import Link from "next/link";

/** Guest account entry — signup page (with sign-in option there). */
export function AuthNavLink() {
  return (
    <Link
      href="/account/signup"
      aria-label="Create account"
      title="Create account"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface hover:text-foreground"
    >
      <UserIcon />
    </Link>
  );
}

function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
