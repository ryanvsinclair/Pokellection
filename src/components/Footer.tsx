import { SiteLogo } from "@/components/SiteLogo";
import { LOCATION } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <SiteLogo className="h-9 w-auto" />
        <p className="mt-1">Local pickup in {LOCATION}. Ships across Canada via e-transfer.</p>
        <p className="mt-4 text-xs">
          Not affiliated with Nintendo, Creatures Inc., or The Pokémon Company.
        </p>
      </div>
    </footer>
  );
}
