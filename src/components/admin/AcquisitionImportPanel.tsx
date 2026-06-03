"use client";

import { useMemo, useState } from "react";
import type { CollectrPortfolioItem } from "@/lib/collectr";
import { scrapeCollectrPortfolioFromBrowser } from "@/lib/collectr-client";
import { formatCollectrListingLabel } from "@/lib/collectr-card-import";
import { formatCad } from "@/lib/utils";

interface MergePreview {
  item: CollectrPortfolioItem;
  cardId: string;
  scrapedLabel: string;
  existingLabel: string;
  currentQuantity: number;
  addQuantity: number;
  newQuantity: number;
}

interface PreviewPayload {
  scrapedCount: number;
  totalCards: number | null;
  newCount: number;
  mergeCount: number;
  matchNote?: string;
  toAdd: CollectrPortfolioItem[];
  toMerge: MergePreview[];
  scraped: CollectrPortfolioItem[];
}

interface Props {
  newPurchasesUrl: string;
}

export function AcquisitionImportPanel({ newPurchasesUrl }: Props) {
  const [purchasePrice, setPurchasePrice] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);

  const urlReady = newPurchasesUrl.trim().length > 0;

  const totalQty = useMemo(() => {
    if (!preview) return 0;
    return preview.scraped.reduce((sum, item) => sum + item.quantity, 0);
  }, [preview]);

  async function runPreview() {
    if (!urlReady) {
      setError("Save a new purchases Collectr URL first.");
      return;
    }

    setLoadingPreview(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const scrapeResult = await scrapeCollectrPortfolioFromBrowser(newPurchasesUrl.trim());

      const response = await fetch("/api/admin/collectr/acquisition/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: scrapeResult.items,
          totalCards: scrapeResult.totalCards,
        }),
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
          : "Could not reach Collectr. Check the new purchases URL.",
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  async function applyPreview() {
    if (!preview) return;
    const price = Number.parseFloat(purchasePrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter how much you paid for this lot (CAD).");
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/collectr/acquisition/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scraped: preview.scraped,
        purchasePriceCad: price,
        label: label.trim() || undefined,
        note: note.trim() || undefined,
        showcaseUrl: newPurchasesUrl.trim(),
      }),
    });

    const payload = (await response.json()) as {
      added?: number;
      merged?: number;
      acquisitionId?: string;
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Apply failed.");
      setApplying(false);
      return;
    }

    setSuccess(
      `Acquisition saved: ${payload.added ?? 0} new cards, ${payload.merged ?? 0} quantity bumps. ` +
        `View P&L on Acquisitions.`,
    );
    setPreview(null);
    setPurchasePrice("");
    setApplying(false);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold">Import acquisition</h3>
        <p className="mt-1 text-sm text-muted">
          One-shot import from your <strong>new purchases</strong> showcase. Cards list as{" "}
          <code className="text-xs">available</code> at Collectr market prices; duplicates
          increase quantity. After import, merge cards into main inside Collectr — temp can
          stay empty.
        </p>
      </div>

      {!urlReady && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Add and save a new purchases URL in Collectr links above.
        </p>
      )}

      <button
        type="button"
        onClick={runPreview}
        disabled={loadingPreview || !urlReady}
        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
      >
        {loadingPreview ? "Scraping temp showcase…" : "Preview acquisition import"}
      </button>

      {error && <p className="text-sm text-primary">{error}</p>}
      {success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>}

      {preview && (
        <div className="space-y-4 rounded-lg bg-surface p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="Listings scraped" value={preview.scrapedCount} />
            <Stat label="New cards" value={preview.newCount} />
            <Stat
              label="Qty bumps"
              value={preview.mergeCount}
              detail={`${totalQty} total units`}
            />
          </div>

          {preview.matchNote && (
            <p className="text-xs text-muted">{preview.matchNote}</p>
          )}

          {preview.toAdd.length > 0 && (
            <PreviewList
              title="New cards to add"
              items={preview.toAdd.map(
                (item) =>
                  `${formatCollectrListingLabel({
                    title: item.title,
                    setName: item.setName,
                    cardNumber: item.cardNumber,
                    printing: item.productSubType,
                    condition: item.condition,
                  })} ×${item.quantity} · ${formatCad(item.marketPriceCad)}`,
              )}
            />
          )}

          {preview.toMerge.length > 0 && (
            <PreviewList
              title="Increase quantity (matched existing site listing)"
              items={preview.toMerge.map((row) => {
                const sameLabel = row.scrapedLabel === row.existingLabel;
                const detail = sameLabel
                  ? row.scrapedLabel
                  : `Temp: ${row.scrapedLabel} ↔ Site: ${row.existingLabel}`;
                return `${detail} — qty ${row.currentQuantity} → ${row.newQuantity} (+${row.addQuantity} from temp)`;
              })}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">How much did you pay for this lot? (CAD) *</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="e.g. 250.00"
                className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Label (optional)</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Binder from Kijiji"
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Note (optional)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Seller, deal notes…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={applyPreview}
            disabled={applying}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {applying ? "Importing…" : "Confirm acquisition import"}
          </button>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
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
      <ul className="max-h-48 space-y-1 overflow-auto rounded-md border border-border bg-card p-2 text-sm">
        {items.slice(0, 30).map((item, index) => (
          <li key={`${item}-${index}`} className="border-b border-border pb-1 last:border-none">
            {item}
          </li>
        ))}
        {items.length > 30 && (
          <li className="pt-1 text-xs text-muted">+ {items.length - 30} more…</li>
        )}
      </ul>
    </div>
  );
}
