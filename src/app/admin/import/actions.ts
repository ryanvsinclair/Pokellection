"use server";

import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import {
  normalizeCollectrPortfolios,
  parseCollectrPortfoliosFromDb,
  type CollectrPortfolioConfig,
} from "@/lib/collectr-portfolios";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function saveCollectrPortfolios(
  portfolios: CollectrPortfolioConfig[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    await assertManager(supabase);

    const normalized = normalizeCollectrPortfolios(portfolios);
    if (normalized.length === 0) {
      return { ok: false, error: "Add at least one portfolio with a valid Collectr URL." };
    }

    const { error } = await supabase
      .from("site_settings")
      .update({ collectr_portfolios: normalized as unknown as Json })
      .eq("id", 1);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/import");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save portfolios.";
    return { ok: false, error: message };
  }
}

export async function loadCollectrPortfolios(): Promise<CollectrPortfolioConfig[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("collectr_portfolios")
    .eq("id", 1)
    .maybeSingle();

  return parseCollectrPortfoliosFromDb(data?.collectr_portfolios);
}
