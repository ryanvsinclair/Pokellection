import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfile } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("buyer_id", user.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My account</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/checkout"
          className="rounded-xl border border-border bg-card p-4 hover:bg-surface"
        >
          <p className="font-semibold">Cart</p>
          <p className="text-sm text-muted">View cart & checkout</p>
        </Link>
        <Link
          href="/account/orders"
          className="rounded-xl border border-border bg-card p-4 hover:bg-surface"
        >
          <p className="font-semibold">Orders</p>
          <p className="text-sm text-muted">{count ?? 0} past orders</p>
        </Link>
      </div>

      <form action={updateProfile} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Profile</h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Display name</span>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Phone</span>
          <input
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
        >
          Save profile
        </button>
      </form>

      <form action="/auth/signout" method="post">
        <button type="submit" className="text-sm text-muted underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
