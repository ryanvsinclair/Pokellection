"use client";

import { useState } from "react";
import { saveCollectrLinks } from "@/app/admin/import/actions";
import type { CollectrRoleUrls } from "@/lib/collectr-settings";

const FIELDS: { key: keyof CollectrRoleUrls; label: string; hint: string }[] = [
  {
    key: "main",
    label: "Main (English)",
    hint: "English inventory — sync sets language to English.",
  },
  {
    key: "newPurchases",
    label: "New purchases (temp holding)",
    hint:
      "Use the full Share link with ?collection=… (non-main collections). Acquisition import only — not showcase sync.",
  },
  {
    key: "french",
    label: "French",
    hint: "French showcase — sync sets language to French.",
  },
  {
    key: "japanese",
    label: "Japanese",
    hint: "Japanese showcase — sync sets language to Japanese.",
  },
  {
    key: "korean",
    label: "Korean",
    hint: "Korean showcase — sync sets language to Korean.",
  },
];

interface Props {
  initialUrls: CollectrRoleUrls;
}

export function CollectrLinksForm({ initialUrls }: Props) {
  const [urls, setUrls] = useState<CollectrRoleUrls>(initialUrls);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: keyof CollectrRoleUrls, value: string) {
    setUrls((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    const result = await saveCollectrLinks(urls);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setMessage("Collectr links saved.");
    setSaving(false);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold">Collectr links</h3>
        <p className="mt-1 text-sm text-muted">
          Main, temp new purchases, French, Japanese, and Korean. Showcase sync sets each
          card&apos;s language from the collection you sync.
        </p>
      </div>

      <div className="space-y-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="block space-y-1 text-sm">
            <span className="font-medium">{field.label}</span>
            <input
              value={urls[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder="https://app.getcollectr.com/showcase/profile/@username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
            <span className="text-xs text-muted">{field.hint}</span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
      >
        {saving ? "Saving…" : "Save Collectr links"}
      </button>

      {message && <p className="text-sm text-muted">{message}</p>}
      {error && <p className="text-sm text-primary">{error}</p>}
    </section>
  );
}
