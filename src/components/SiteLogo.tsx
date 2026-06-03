import Link from "next/link";
import { PokellectionLogoMark } from "@/components/PokellectionLogoMark";
import { SITE_NAME } from "@/lib/utils";

interface Props {
  className?: string;
}

export function SiteLogo({ className = "h-10 w-auto sm:h-12" }: Props) {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center overflow-visible"
      aria-label={SITE_NAME}
    >
      <PokellectionLogoMark variant="light" className={`${className} dark:hidden`} />
      <PokellectionLogoMark
        variant="dark"
        className={`${className} hidden dark:block`}
      />
    </Link>
  );
}
