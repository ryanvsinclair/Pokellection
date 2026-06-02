import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/utils";

/** Trimmed wordmark asset (1397×340). */
const LOGO_WIDTH = 1397;
const LOGO_HEIGHT = 340;

interface Props {
  priority?: boolean;
  className?: string;
}

const logoProps = {
  width: LOGO_WIDTH,
  height: LOGO_HEIGHT,
  sizes: "(max-width: 640px) 220px, 320px" as const,
};

export function SiteLogo({
  priority = false,
  className = "h-12 w-auto sm:h-16",
}: Props) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center">
      <Image
        src="/pokellection-logo-mark.png"
        alt={SITE_NAME}
        {...logoProps}
        priority={priority}
        className={`${className} dark:hidden`}
      />
      <Image
        src="/pokellection-logo-mark-dark.png"
        alt=""
        aria-hidden
        {...logoProps}
        priority={priority}
        className={`${className} hidden dark:block`}
      />
    </Link>
  );
}
