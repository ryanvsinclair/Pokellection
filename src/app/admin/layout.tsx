import Link from "next/link";
import { requireManagerPage } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/cards/new", label: "Add card" },
  { href: "/admin/import", label: "CSV import" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  await requireManagerPage(supabase);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted">Manage your Pokellection inventory.</p>
        </div>
        <SignOutButton />
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 font-medium hover:bg-surface"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
      >
        Sign out
      </button>
    </form>
  );
}
