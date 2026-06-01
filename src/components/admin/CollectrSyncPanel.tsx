"use client";

import { useMemo, useState } from "react";
import type { CollectrPortfolioItem } from "@/lib/collectr";
import { scrapeCollectrPortfolioFromBrowser } from "@/lib/collectr-client";

interface MarkSoldItem {
  productId: string;
  cardId: string;
  title: string;
  status: string;
}

interface PreviewPayload {
  scrapedCount: number;
  totalCards: number | null;
  source?: "api" | "html";
  warning?: string;
  existingCount: number;
  toAdd: CollectrPortfolioItem[];
  toReactivate: CollectrPortfolioItem[];
  toMarkSold: MarkSoldItem[];
  scraped: CollectrPortfolioItem[];
}

export function CollectrSyncPanel() {
  const [profileUrl, setProfileUrl] = useState("https://app.getcollectr.com/showcase/profile/@relllyg");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);

  const summary = useMemo(() => {
    if (!preview) return null;
    return {
      newListings: preview.toAdd.length,
      returningListings: preview.toReactivate.length,
      markSold: preview.toMarkSold.length,
      unchanged:
        preview.scrapedCount - preview.toAdd.length - preview.toReactivate.length,
    };
  }, [preview]);

  async function runPreview() {
    setLoadingPreview(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      // Scrape from the browser: Collectr blocks server-side requests via TLS
      // fingerprinting, but allows cross-origin browser reads.
      const { items, totalCards } = await scrapeCollectrPortfolioFromBrowser(profileUrl);

      const response = await fetch("/api/admin/collectr/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, totalCards }),
      });

      const payload = (await response.json()) as PreviewPayload & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Preview failed.");
        return;
      }

      setPreview(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach Collectr. Check the showcase URL and try again.",
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  async function applyPreview() {
    if (!preview) return;
    setApplying(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/collectr/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scraped: preview.scraped }),
    });

    const payload = (await response.json()) as {
      added?: number;
      updated?: number;
      markedSold?: number;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Apply failed.");
      setApplying(false);
      return;
    }

    setSuccess(
      `Sync complete: ${payload.added ?? 0} added, ${payload.updated ?? 0} updated, ${payload.markedSold ?? 0} marked sold.`,
    );
    setApplying(false);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold">Collectr sync (manual trigger)</h3>
        <p className="mt-1 text-sm text-muted">
          Pull your current showcase, preview changes, then confirm to apply.
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Collectr showcase URL</span>
        <input
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <button
        type="button"
        onClick={runPreview}
        disabled={loadingPreview}
        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
      >
        {loadingPreview ? "Checking portfolio..." : "Preview sync changes"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      {preview && summary && (
        <div className="space-y-4 rounded-lg bg-slate-50 p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryPill
              label="Scraped listings"
              value={preview.scrapedCount}
              detail={
                preview.totalCards != null
                  ? `${preview.totalCards} cards on Collectr`
                  : undefined
              }
            />
            <SummaryPill label="Add for sale" value={summary.newListings} />
            <SummaryPill label="Reactivate" value={summary.returningListings} />
            <SummaryPill label="Mark sold" value={summary.markSold} />
            <SummaryPill label="Unchanged" value={summary.unchanged} />
          </div>

          {preview.warning && (
            <p className="text-sm text-amber-700">{preview.warning}</p>
          )}
          {preview.source === "api" && preview.totalCards != null && (
            <p className="text-sm text-muted">
              Fetched {preview.scrapedCount} owned Pokemon listings via Collectr API
              {preview.scrapedCount !== preview.totalCards
                ? ` (${preview.totalCards} total cards including quantity).`
                : "."}
            </p>
          )}

          {preview.toAdd.length > 0 && (
            <PreviewList
              title="New cards to add"
              items={preview.toAdd.map((item) => `${item.title} (${item.cardNumber ?? "n/a"})`)}
            />
          )}

          {preview.toMarkSold.length > 0 && (
            <PreviewList
              title="Cards to mark sold"
              items={preview.toMarkSold.map((item) => item.title)}
            />
          )}

          <button
            type="button"
            onClick={applyPreview}
            disabled={applying}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {applying ? "Applying..." : "Confirm and apply sync"}
          </button>
        </div>
      )}
    </section>
  );
}

function SummaryPill({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {detail && <p className="text-xs text-muted">{detail}</p>}
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="max-h-48 space-y-1 overflow-auto rounded-md border border-border bg-white p-2 text-sm">
        {items.slice(0, 30).map((item) => (
          <li key={item} className="border-b border-slate-100 pb-1 last:border-none">
            {item}
          </li>
        ))}
        {items.length > 30 && (
          <li className="pt-1 text-xs text-muted">+ {items.length - 30} more...</li>
        )}
      </ul>
    </div>
  );
}
