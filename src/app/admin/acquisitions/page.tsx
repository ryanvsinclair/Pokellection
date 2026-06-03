import Link from "next/link";
import { getInventoryAcquisitions } from "@/lib/queries/acquisitions";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

export default async function AcquisitionsPage() {
  const supabase = await createClient();
  const acquisitions = await getInventoryAcquisitions(supabase);

  const totals = acquisitions.reduce(
    (acc, row) => {
      acc.spent += Number(row.purchase_price_cad);
      acc.recovered += row.recoveredCad;
      acc.outstanding += row.outstandingValueCad;
      return acc;
    },
    { spent: 0, recovered: 0, outstanding: 0 },
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Acquisitions (P&L)</h2>
        <p className="mt-1 text-sm text-muted">
          Bulk lots imported from the new purchases Collectr showcase. Recovered = site orders
          and private sales on linked cards.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/admin/import" className="font-medium text-primary underline">
            Import another lot
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total spent" value={formatCad(totals.spent)} />
        <SummaryCard label="Recovered revenue" value={formatCad(totals.recovered)} />
        <SummaryCard label="Outstanding list value" value={formatCad(totals.outstanding)} />
      </div>

      {acquisitions.length === 0 ? (
        <p className="text-sm text-muted">No acquisitions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Cards</th>
                <th className="px-4 py-3 font-medium">Spent</th>
                <th className="px-4 py-3 font-medium">Recovered</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {acquisitions.map((row) => {
                const spent = Number(row.purchase_price_cad);
                const net = row.recoveredCad - spent;
                return (
                  <tr key={row.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(row.purchased_at).toLocaleDateString("en-CA")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.label || "Acquisition"}</p>
                      {row.note && <p className="text-xs text-muted">{row.note}</p>}
                    </td>
                    <td className="px-4 py-3">{row.card_count}</td>
                    <td className="px-4 py-3">{formatCad(spent)}</td>
                    <td className="px-4 py-3">{formatCad(row.recoveredCad)}</td>
                    <td className="px-4 py-3">{formatCad(row.outstandingValueCad)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        net >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-primary"
                      }`}
                    >
                      {formatCad(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
