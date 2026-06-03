"use client";

import { useEffect, useId, useState } from "react";

const STORAGE_KEY = "shop-pricing-notice-dismissed-v1";

export function ShopPricingNotice() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setHydrated(true);
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  function reopen() {
    setOpen(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (!hydrated) return null;

  return (
    <div className="relative">
      {!open && (
        <button
          type="button"
          onClick={reopen}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted transition hover:text-foreground"
          aria-label="Show pricing information"
        >
          <InfoIcon />
          Pricing info
        </button>
      )}

      {open && (
        <div
          id={panelId}
          role="status"
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
              <InfoIcon />
            </span>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <p className="font-semibold text-foreground">How our prices work</p>
              <p className="leading-relaxed text-muted">
                Listed prices are based on TCGPlayer market values at the time each card was
                published. If the market price has gone down since then, we will honor the
                lower price when you pick up or receive your order.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-md p-1 text-muted transition hover:bg-surface hover:text-foreground"
              aria-label="Dismiss pricing information"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
