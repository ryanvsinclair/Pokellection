import { CsvImportForm } from "@/components/admin/CsvImportForm";
import { CollectrSyncPanel } from "@/components/admin/CollectrSyncPanel";

export default function ImportPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <CollectrSyncPanel />

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
