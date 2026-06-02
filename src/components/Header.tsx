import Link from "next/link";
import { MobileNavMenu, type NavLinkItem } from "@/components/MobileNavMenu";
import { SiteLogo } from "@/components/SiteLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getUserProfileRole, isManager } from "@/lib/auth-roles";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

function buildNavLinks(user: { id: string } | null, role: UserRole | null): NavLinkItem[] {
  const links: NavLinkItem[] = [
    { href: "/shop", label: "Shop" },
    { href: "/checkout", label: "Cart" },
  ];

  if (user) {
    links.push(
      { href: "/account", label: "Account" },
      { href: "/account/orders", label: "Orders" },
    );
    if (isManager(role)) {
      links.push({ href: "/admin", label: "Admin", muted: true });
    }
  } else {
    links.push(
      { href: "/account/login", label: "Sign in" },
      { href: "/account/signup", label: "Sign up" },
    );
  }

  return links;
}

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserProfileRole(supabase, user.id) : null;
  const navLinks = buildNavLinks(user, role);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <SiteLogo priority />
        <div className="flex items-center gap-2 md:gap-6">
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={link.muted ? "text-muted" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <MobileNavMenu links={navLinks} />
        </div>
      </div>
    </header>
  );
}
