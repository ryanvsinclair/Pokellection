"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { roundPriceCad } from "@/lib/currency";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export function CsvImportForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setMessage(null);

    const text = await file.text();
    const rows = parseCsv(text);
    const supabase = createClient();

    const inserts = rows.map((row) => ({
      title: row.title,
      slug: `${slugify(row.title)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      set_name: row.set_name || null,
      card_number: row.card_number || null,
      rarity: row.rarity || null,
      condition: (row.condition || "NM") as "NM" | "LP" | "MP" | "HP" | "DMG",
      price_cad: roundPriceCad(Number(row.price_cad)),
      quantity: Number(row.quantity || 1),
      status: "available" as const,
      description: row.description || null,
      tags: row.tags ? row.tags.split("|").filter(Boolean) : [],
      photo_paths: [] as string[],
      featured: false,
      language: "english" as const,
    }));

    const { error } = await supabase.from("cards").insert(inserts);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(`Imported ${inserts.length} cards.`);
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="block w-full text-sm"
      />
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
