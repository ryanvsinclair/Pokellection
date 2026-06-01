import Link from "next/link";
import { signInBuyer } from "@/app/account/actions";

export default async function BuyerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: redirectTo } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Access your cart and order history.</p>
      </div>

      <form action={signInBuyer} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <input type="hidden" name="redirect" value={redirectTo ?? "/account"} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Password</span>
          <input name="password" type="password" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        {error && <p className="text-sm text-primary">{decodeURIComponent(error)}</p>}
        <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white">
          Sign in
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        No account?{" "}
        <Link href="/account/signup" className="font-medium text-primary">
          Create one
        </Link>
      </p>
    </div>
  );
}
