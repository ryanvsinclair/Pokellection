import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function MobileNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const links = user
    ? [
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        { href: "/checkout", label: "Cart" },
        { href: "/account", label: "Account" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        { href: "/account/login", label: "Sign in" },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className={`mx-auto grid max-w-lg grid-cols-${links.length}`} style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-14 flex-col items-center justify-center text-xs font-medium"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
