import { createClient } from "@/lib/supabase/server";

export default async function AdminReservationsPage() {
  const supabase = await createClient();
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .order("reserved_at", { ascending: false });

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Buyer</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody>
          {(reservations ?? []).map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-medium">{r.buyer_name}</p>
                <p className="text-muted">{r.buyer_email}</p>
              </td>
              <td className="px-4 py-3 capitalize">{r.status}</td>
              <td className="px-4 py-3">{new Date(r.expires_at).toLocaleString("en-CA")}</td>
            </tr>
          ))}
          {(reservations ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-muted">
                No reservations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
