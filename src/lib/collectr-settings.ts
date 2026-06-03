import {
  profileIdFromPortfolioUrl,
  type CollectrPortfolioConfig,
} from "@/lib/collectr-portfolios";

export type CollectrRoleUrls = {
  main: string;
  newPurchases: string;
  french: string;
  japaneseKorean: string;
};

export const EMPTY_COLLECTR_URLS: CollectrRoleUrls = {
  main: "",
  newPurchases: "",
  french: "",
  japaneseKorean: "",
};

export function parseCollectrRoleUrls(row: {
  collectr_main_url?: string | null;
  collectr_new_purchases_url?: string | null;
  collectr_french_url?: string | null;
  collectr_japanese_korean_url?: string | null;
  collectr_portfolios?: unknown;
} | null): CollectrRoleUrls {
  if (!row) return { ...EMPTY_COLLECTR_URLS };

  let main = (row.collectr_main_url ?? "").trim();
  const newPurchases = (row.collectr_new_purchases_url ?? "").trim();
  const french = (row.collectr_french_url ?? "").trim();
  const japaneseKorean = (row.collectr_japanese_korean_url ?? "").trim();

  if (!main && Array.isArray(row.collectr_portfolios)) {
    const first = row.collectr_portfolios[0] as { url?: string } | undefined;
    main = String(first?.url ?? "").trim();
  }

  return { main, newPurchases, french, japaneseKorean };
}

/** Showcases used for ongoing sync (excludes new-purchases temp holding). */
export function syncPortfolioConfigs(urls: CollectrRoleUrls): CollectrPortfolioConfig[] {
  const slots: { label: string; url: string }[] = [
    { label: "Main", url: urls.main.trim() },
    { label: "French", url: urls.french.trim() },
    { label: "Japanese / Korean", url: urls.japaneseKorean.trim() },
  ];

  const configs: CollectrPortfolioConfig[] = [];
  for (const slot of slots) {
    if (!slot.url) continue;
    try {
      const id = profileIdFromPortfolioUrl(slot.url);
      configs.push({ id, label: slot.label, url: slot.url });
    } catch {
      // skip invalid URL until manager fixes it
    }
  }
  return configs;
}

export function acquisitionPortfolioUrl(urls: CollectrRoleUrls): string {
  return urls.newPurchases.trim();
}
