import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-5 text-sm">
      <h2 className="text-lg font-semibold">Site settings</h2>
      {settings ? (
        <dl className="space-y-3">
          <div>
            <dt className="text-muted">Pickup location</dt>
            <dd className="font-medium">{settings.pickup_location_label}</dd>
          </div>
          <div>
            <dt className="text-muted">E-transfer email</dt>
            <dd className="font-medium">{settings.etransfer_email}</dd>
          </div>
          <div>
            <dt className="text-muted">Untracked shipping</dt>
            <dd className="font-medium">${settings.untracked_shipping_fee_cad} CAD</dd>
          </div>
          <div>
            <dt className="text-muted">Tracked shipping</dt>
            <dd className="font-medium">${settings.tracked_shipping_fee_cad} CAD</dd>
          </div>
        </dl>
      ) : (
        <p className="text-muted">
          Run the Supabase migration to seed default settings, then edit them here.
        </p>
      )}
    </div>
  );
}
