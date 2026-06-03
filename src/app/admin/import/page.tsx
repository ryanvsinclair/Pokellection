import { CsvImportForm } from "@/components/admin/CsvImportForm";
import { CollectrSyncPanel } from "@/components/admin/CollectrSyncPanel";
import { parseCollectrPortfoliosFromDb } from "@/lib/collectr-portfolios";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("collectr_portfolios")
    .eq("id", 1)
    .maybeSingle();

  const initialPortfolios = parseCollectrPortfoliosFromDb(settings?.collectr_portfolios);

  return (
    <div className="max-w-3xl space-y-4">
      <CollectrSyncPanel initialPortfolios={initialPortfolios} />

      <div>
        <h2 className="text-lg font-semibold">Bulk CSV import</h2>
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
