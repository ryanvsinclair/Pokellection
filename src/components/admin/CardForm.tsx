"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CardForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title"));
    const slug = `${slugify(title)}-${Date.now()}`;
    const supabase = createClient();

    const photoPaths: string[] = [];
    for (const file of photos) {
      const path = `cards/${slug}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("card-photos")
        .upload(path, file);

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
      photoPaths.push(path);
    }

    const { error: insertError } = await supabase.from("cards").insert({
      title,
      slug,
      set_name: String(form.get("set_name") || "") || null,
      card_number: String(form.get("card_number") || "") || null,
      rarity: String(form.get("rarity") || "") || null,
      condition: String(form.get("condition")) as "NM" | "LP" | "MP" | "HP" | "DMG",
      price_cad: Number(form.get("price_cad")),
      quantity: Number(form.get("quantity") || 1),
      status: "available",
      description: String(form.get("description") || "") || null,
      tags: [],
      photo_paths: photoPaths,
      featured: false,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/admin/cards");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Photos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          className="w-full text-sm"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Title</span>
        <input name="title" required className="w-full rounded-lg border border-border px-3 py-2" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Set</span>
          <input name="set_name" className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Card number</span>
          <input name="card_number" className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Condition</span>
          <select name="condition" className="w-full rounded-lg border border-border px-3 py-2">
            {["NM", "LP", "MP", "HP", "DMG"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Price (CAD)</span>
          <input name="price_cad" type="number" step="0.01" min="0" required className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Quantity</span>
          <input name="quantity" type="number" min="1" defaultValue={1} className="w-full rounded-lg border border-border px-3 py-2" />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Rarity</span>
        <input name="rarity" className="w-full rounded-lg border border-border px-3 py-2" />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Description</span>
        <textarea name="description" rows={3} className="w-full rounded-lg border border-border px-3 py-2" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Saving…" : "Publish card"}
      </button>
    </form>
  );
}
