import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

const iconClassName = "h-4 w-4 shrink-0";

const actionButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50";

type IconProps = { className?: string };

export function IconCamera({ className }: IconProps) {
  return (
    <svg
      className={className ?? iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function IconPencil({ className }: IconProps) {
  return (
    <svg
      className={className ?? iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconReceipt({ className }: IconProps) {
  return (
    <svg
      className={className ?? iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8H8" />
      <path d="M16 12H8" />
      <path d="M12 16H8" />
    </svg>
  );
}

export function IconEyeOff({ className }: IconProps) {
  return (
    <svg
      className={className ?? iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.733 5.076 10.2 5.65 7 8.874" />
      <path d="m2 2 20 20" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M12 18c4.97 0 7.9-3.11 9.1-4.72a1.3 1.3 0 0 0 0-1.56C19.9 10.11 16.97 7 12 7a9.7 9.7 0 0 0-1.74.16" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg
      className={className ?? iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export function IconSpinner({ className }: IconProps) {
  return (
    <svg
      className={`${className ?? iconClassName} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function AdminIconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`${actionButtonClassName} border-border ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminIconLink({
  href,
  label,
  children,
  className = "",
}: {
  href: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`${actionButtonClassName} border-border ${className}`.trim()}
    >
      {children}
    </Link>
  );
}
