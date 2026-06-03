import Link from "next/link";
import { signUpBuyer } from "@/app/account/actions";

export default async function BuyerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: redirectTo } = await searchParams;
  const loginHref = redirectTo
    ? `/account/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/account/login";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-muted">
          An account is required to reserve cards, use your cart, and check out (pickup, delivery,
          or shipping).
        </p>
      </div>

      <form action={signUpBuyer} className="space-y-4 rounded-xl border border-border bg-card p-5">
        {redirectTo && (
          <input type="hidden" name="redirect" value={redirectTo} />
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Display name</span>
          <input name="display_name" className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Password</span>
          <input name="password" type="password" required minLength={8} className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        {error && <p className="text-sm text-primary">{decodeURIComponent(error)}</p>}
        <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white">
          Create account
        </button>
      </form>

      <div className="space-y-2 text-center">
        <p className="text-sm text-muted">Already have an account?</p>
        <Link
          href={loginHref}
          className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-surface"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
