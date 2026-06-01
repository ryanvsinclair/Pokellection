import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/utils";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profileRole = profile?.role ?? null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/shop">Shop</Link>
            <Link href="/checkout">Cart</Link>
            {user ? (
              <>
                <Link href="/account">Account</Link>
                <Link href="/account/orders">Orders</Link>
                {profileRole === "manager" && (
                  <Link href="/admin" className="text-muted">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/account/login">Sign in</Link>
                <Link href="/account/signup">Sign up</Link>
              </>
            )}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
