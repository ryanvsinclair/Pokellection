import { AcquisitionImportPanel } from "@/components/admin/AcquisitionImportPanel";
import { CollectrLinksForm } from "@/components/admin/CollectrLinksForm";
import { CollectrSyncPanel } from "@/components/admin/CollectrSyncPanel";
import { CsvImportForm } from "@/components/admin/CsvImportForm";
import {
  acquisitionPortfolioUrl,
  parseCollectrRoleUrls,
  syncPortfolioConfigs,
} from "@/lib/collectr-settings";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select(
      "collectr_main_url, collectr_new_purchases_url, collectr_french_url, collectr_japanese_url, collectr_korean_url, collectr_japanese_korean_url, collectr_portfolios",
    )
    .eq("id", 1)
    .maybeSingle();

  const roleUrls = parseCollectrRoleUrls(settings);
  const syncPortfolios = syncPortfolioConfigs(roleUrls);
  const newPurchasesUrl = acquisitionPortfolioUrl(roleUrls);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Import & Collectr</h2>
        <p className="mt-1 text-sm text-muted">
          Configure Collectr showcases, import bulk purchases, sync listings, or upload CSV.
        </p>
      </div>

      <CollectrLinksForm initialUrls={roleUrls} />
      <AcquisitionImportPanel newPurchasesUrl={newPurchasesUrl} />
      <CollectrSyncPanel syncPortfolios={syncPortfolios} />

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-semibold">Bulk CSV import</h3>
        <p className="mt-1 text-sm text-muted">
          Upload a CSV to add many cards at once. Photos can be added after import.
        </p>
      </div>
      <CsvImportForm />
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
{`title,set_name,card_number,rarity,condition,price_cad,quantity,description,tags
Charizard VMAX,Darkness Ablaze,020/189,Rare Holo,NM,45.00,1,,holo|vmax`}
      </pre>
    </div>
  );
}
