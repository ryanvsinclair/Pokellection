"use client";

import { useMemo, useState } from "react";
import { saveCollectrPortfolios } from "@/app/admin/import/actions";
import type { CollectrPortfolioItem } from "@/lib/collectr";
import { scrapeCollectrPortfolioFromBrowser } from "@/lib/collectr-client";
import {
  scrapeCollectrPortfoliosFromBrowser,
  type CollectrPortfolioConfig,
} from "@/lib/collectr-portfolios";

interface DelistItem {
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
  toRelist: CollectrPortfolioItem[];
  toDelist: DelistItem[];
  scraped: CollectrPortfolioItem[];
  showcaseProfileIds: string[];
  syncLabel?: string;
  portfolioSources?: { label: string; count: number }[];
}

interface Props {
  initialPortfolios: CollectrPortfolioConfig[];
}

const ALL_PORTFOLIOS = "__all__";

function newPortfolioRow(): CollectrPortfolioConfig {
  return {
    id: crypto.randomUUID(),
    label: "",
    url: "",
  };
}

export function CollectrSyncPanel({ initialPortfolios }: Props) {
  const [portfolios, setPortfolios] = useState<CollectrPortfolioConfig[]>(
    initialPortfolios.length > 0 ? initialPortfolios : [newPortfolioRow()],
  );
  const [syncTarget, setSyncTarget] = useState<string>(
    initialPortfolios[0]?.id ?? ALL_PORTFOLIOS,
  );
  const [savingPortfolios, setSavingPortfolios] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);

  const savedPortfolios = useMemo(
    () => portfolios.filter((row) => row.url.trim()),
    [portfolios],
  );

  const summary = useMemo(() => {
    if (!preview) return null;
    return {
      newListings: preview.toAdd.length,
      relist: preview.toRelist.length,
      delist: preview.toDelist.length,
      unchanged:
        preview.scrapedCount - preview.toAdd.length - preview.toRelist.length,
    };
  }, [preview]);

  function updatePortfolio(id: string, patch: Partial<CollectrPortfolioConfig>) {
    setPortfolios((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addPortfolio() {
    setPortfolios((rows) => [...rows, newPortfolioRow()]);
  }

  function removePortfolio(id: string) {
    setPortfolios((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [newPortfolioRow()];
    });
    if (syncTarget === id) {
      setSyncTarget(ALL_PORTFOLIOS);
    }
  }

  async function handleSavePortfolios() {
    setSavingPortfolios(true);
    setPortfolioMessage(null);
    setError(null);

    const result = await saveCollectrPortfolios(portfolios);
    if (!result.ok) {
      setPortfolioMessage(result.error);
      setSavingPortfolios(false);
      return;
    }

    const normalized = portfolios
      .map((row) => ({ ...row, url: row.url.trim(), label: row.label.trim() }))
      .filter((row) => row.url);
    setPortfolios(normalized.length > 0 ? normalized : [newPortfolioRow()]);
    if (!normalized.some((row) => row.id === syncTarget)) {
      setSyncTarget(normalized.length === 1 ? normalized[0].id : ALL_PORTFOLIOS);
    }
    setPortfolioMessage("Portfolios saved.");
    setSavingPortfolios(false);
  }

  function portfoliosToSync(): CollectrPortfolioConfig[] {
    if (syncTarget === ALL_PORTFOLIOS) return savedPortfolios;
    const one = savedPortfolios.find((row) => row.id === syncTarget);
    return one ? [one] : [];
  }

  async function runPreview() {
    setLoadingPreview(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const targets = portfoliosToSync();
      const syncLabel =
        syncTarget === ALL_PORTFOLIOS
          ? `All portfolios (${targets.length})`
          : (targets[0]?.label ?? "Portfolio");

      const scrapeResult = await scrapeCollectrPortfoliosFromBrowser(
        targets,
        scrapeCollectrPortfolioFromBrowser,
      );

      const response = await fetch("/api/admin/collectr/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: scrapeResult.items,
          totalCards: scrapeResult.totalCards,
          showcaseProfileIds: scrapeResult.showcaseProfileIds,
        }),
      });

      const payload = (await response.json()) as PreviewPayload & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Preview failed.");
        return;
      }

      setPreview({
        ...payload,
        showcaseProfileIds: scrapeResult.showcaseProfileIds,
        syncLabel,
        portfolioSources: scrapeResult.sources,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach Collectr. Check the showcase URLs and try again.",
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
      body: JSON.stringify({
        scraped: preview.scraped,
        showcaseProfileIds: preview.showcaseProfileIds,
      }),
    });

    const payload = (await response.json()) as {
      added?: number;
      updated?: number;
      delisted?: number;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Apply failed.");
      setApplying(false);
      return;
    }

    setSuccess(
      `Sync complete: ${payload.added ?? 0} added, ${payload.updated ?? 0} updated, ${payload.delisted ?? 0} delisted.`,
    );
    setApplying(false);
  }

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold">Collectr sync</h3>
        <p className="mt-1 text-sm text-muted">
          Collectr decides what is for sale: owned in your showcase → listed; missing → delisted
          (draft). Sold history stays on{" "}
          <a href="/admin/sales" className="font-medium text-primary underline">
            Sales
          </a>
          . Re-buy a card and sync will list it again — remove sold copies from Collectr after
          each sale.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Your Collectr portfolios</h4>
          <button
            type="button"
            onClick={addPortfolio}
            className="text-sm font-medium text-primary"
          >
            + Add portfolio
          </button>
        </div>

        <div className="space-y-3">
          {portfolios.map((portfolio, index) => (
            <div
              key={portfolio.id}
              className="grid gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[1fr_2fr_auto]"
            >
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Label</span>
                <input
                  value={portfolio.label}
                  onChange={(e) => updatePortfolio(portfolio.id, { label: e.target.value })}
                  placeholder={index === 0 ? "Main inventory" : "Portfolio name"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Showcase URL</span>
                <input
                  value={portfolio.url}
                  onChange={(e) => updatePortfolio(portfolio.id, { url: e.target.value })}
                  placeholder="https://app.getcollectr.com/showcase/profile/@username"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removePortfolio(portfolio.id)}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSavePortfolios}
            disabled={savingPortfolios}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            {savingPortfolios ? "Saving…" : "Save portfolios"}
          </button>
        </div>
        {portfolioMessage && (
          <p className="text-sm text-muted">{portfolioMessage}</p>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Sync from</span>
          <select
            value={syncTarget}
            onChange={(e) => setSyncTarget(e.target.value)}
            disabled={savedPortfolios.length === 0}
            className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2"
          >
            {savedPortfolios.length > 1 && (
              <option value={ALL_PORTFOLIOS}>All saved portfolios</option>
            )}
            {savedPortfolios.map((portfolio) => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.label || portfolio.url}
              </option>
            ))}
          </select>
        </label>
        {savedPortfolios.length === 0 && (
          <p className="text-sm text-muted">Save at least one portfolio URL before syncing.</p>
        )}

        <button
          type="button"
          onClick={runPreview}
          disabled={loadingPreview || savedPortfolios.length === 0}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
        >
          {loadingPreview ? "Checking portfolio..." : "Preview sync changes"}
        </button>
      </div>

      {error && <p className="text-sm text-primary">{error}</p>}
      {success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>}

      {preview && summary && (
        <div className="space-y-4 rounded-lg bg-surface p-4">
          {preview.syncLabel && (
            <p className="text-sm font-medium">
              Previewing: {preview.syncLabel}
              {preview.portfolioSources && preview.portfolioSources.length > 1 && (
                <span className="mt-1 block text-xs font-normal text-muted">
                  {preview.portfolioSources
                    .map((source) => `${source.label}: ${source.count} listings`)
                    .join(" · ")}
                </span>
              )}
            </p>
          )}

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
            <SummaryPill label="Relist" value={summary.relist} />
            <SummaryPill label="Delist" value={summary.delist} />
            <SummaryPill label="Unchanged" value={summary.unchanged} />
          </div>

          {preview.warning && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{preview.warning}</p>
          )}

          {preview.toAdd.length > 0 && (
            <PreviewList
              title="New cards to add"
              items={preview.toAdd.map(
                (item) => `${item.title} (${item.cardNumber ?? "n/a"}) · ${item.condition}`,
              )}
            />
          )}

          {preview.toRelist.length > 0 && (
            <PreviewList
              title="Relist (back in Collectr)"
              items={preview.toRelist.map(
                (item) => `${item.title} (${item.cardNumber ?? "n/a"}) · ${item.condition}`,
              )}
            />
          )}

          {preview.toDelist.length > 0 && (
            <PreviewList
              title="Delist (not in Collectr)"
              items={preview.toDelist.map((item) => item.title)}
            />
          )}

          <button
            type="button"
            onClick={applyPreview}
            disabled={applying}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
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
          <li className="pt-1 text-xs text-muted">+ {items.length - 30} more...</li>
        )}
      </ul>
    </div>
  );
}
