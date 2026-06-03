import {
  profileIdFromPortfolioUrl,
  showcaseScopeIdFromPortfolioUrl,
  type CollectrPortfolioConfig,
} from "@/lib/collectr-portfolios";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/card-language";
import type { CardLanguage } from "@/types/database";

export type CollectrRoleUrls = {
  main: string;
  newPurchases: string;
  french: string;
  japanese: string;
  korean: string;
};

export const EMPTY_COLLECTR_URLS: CollectrRoleUrls = {
  main: "",
  newPurchases: "",
  french: "",
  japanese: "",
  korean: "",
};

export function parseCollectrRoleUrls(row: {
  collectr_main_url?: string | null;
  collectr_new_purchases_url?: string | null;
  collectr_french_url?: string | null;
  collectr_japanese_url?: string | null;
  collectr_korean_url?: string | null;
  collectr_japanese_korean_url?: string | null;
  collectr_portfolios?: unknown;
} | null): CollectrRoleUrls {
  if (!row) return { ...EMPTY_COLLECTR_URLS };

  let main = (row.collectr_main_url ?? "").trim();
  const newPurchases = (row.collectr_new_purchases_url ?? "").trim();
  const french = (row.collectr_french_url ?? "").trim();
  let japanese = (row.collectr_japanese_url ?? "").trim();
  const korean = (row.collectr_korean_url ?? "").trim();

  if (!japanese && row.collectr_japanese_korean_url) {
    japanese = row.collectr_japanese_korean_url.trim();
  }

  if (!main && Array.isArray(row.collectr_portfolios)) {
    const first = row.collectr_portfolios[0] as { url?: string } | undefined;
    main = String(first?.url ?? "").trim();
  }

  return { main, newPurchases, french, japanese, korean };
}

/** Showcases used for ongoing sync (excludes new-purchases temp holding). */
export function syncPortfolioConfigs(urls: CollectrRoleUrls): CollectrPortfolioConfig[] {
  const slots: { label: string; url: string; language: CardLanguage }[] = [
    { label: "Main", url: urls.main.trim(), language: DEFAULT_CARD_LANGUAGE },
    { label: "French", url: urls.french.trim(), language: "french" },
    { label: "Japanese", url: urls.japanese.trim(), language: "japanese" },
    { label: "Korean", url: urls.korean.trim(), language: "korean" },
  ];

  const configs: CollectrPortfolioConfig[] = [];
  for (const slot of slots) {
    if (!slot.url) continue;
    try {
      profileIdFromPortfolioUrl(slot.url);
      const id = showcaseScopeIdFromPortfolioUrl(slot.url);
      configs.push({ id, label: slot.label, url: slot.url, language: slot.language });
    } catch {
      // skip invalid URL until manager fixes it
    }
  }
  return configs;
}

export function acquisitionPortfolioUrl(urls: CollectrRoleUrls): string {
  return urls.newPurchases.trim();
}
