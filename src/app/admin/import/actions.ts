"use server";

import { revalidatePath } from "next/cache";
import { assertManager } from "@/lib/admin-auth";
import {
  type CollectrRoleUrls,
  parseCollectrRoleUrls,
  syncPortfolioConfigs,
} from "@/lib/collectr-settings";
import {
  normalizeCollectrPortfolios,
  parseCollectrPortfoliosFromDb,
  type CollectrPortfolioConfig,
} from "@/lib/collectr-portfolios";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function saveCollectrLinks(
  urls: CollectrRoleUrls,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    await assertManager(supabase);

    const syncConfigs = syncPortfolioConfigs(urls);
    if (urls.main.trim() && syncConfigs.length === 0) {
      return { ok: false, error: "Main Collectr URL is not a valid showcase link." };
    }

    const portfolios = normalizeCollectrPortfolios(syncConfigs);

    const { error } = await supabase
      .from("site_settings")
      .update({
        collectr_main_url: urls.main.trim(),
        collectr_new_purchases_url: urls.newPurchases.trim(),
        collectr_french_url: urls.french.trim(),
        collectr_japanese_url: urls.japanese.trim(),
        collectr_korean_url: urls.korean.trim(),
        collectr_japanese_korean_url: urls.japanese.trim(),
        collectr_portfolios: portfolios as unknown as Json,
      })
      .eq("id", 1);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/import");
    revalidatePath("/admin/acquisitions");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save Collectr links.";
    return { ok: false, error: message };
  }
}

export async function loadCollectrRoleUrls(): Promise<CollectrRoleUrls> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select(
      "collectr_main_url, collectr_new_purchases_url, collectr_french_url, collectr_japanese_url, collectr_korean_url, collectr_japanese_korean_url, collectr_portfolios",
    )
    .eq("id", 1)
    .maybeSingle();

  return parseCollectrRoleUrls(data);
}

/** @deprecated Use loadCollectrRoleUrls + syncPortfolioConfigs */
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
