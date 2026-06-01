import Link from "next/link";
import { signUpBuyer } from "@/app/account/actions";

export default async function BuyerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-muted">Save your cart and track orders & shipping.</p>
      </div>

      <form action={signUpBuyer} className="space-y-4 rounded-xl border border-border bg-card p-5">
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
        {error && <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>}
        <button type="submit" className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white">
          Create account
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/account/login" className="font-medium text-red-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
