import Link from "next/link";
import { RecordPrivateSaleForm } from "@/components/admin/RecordPrivateSaleForm";
import { getSoldHistory } from "@/lib/queries/sales";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

export const metadata = {
  title: "Sales history",
};

export default async function AdminSalesPage() {
  const supabase = await createClient();
  const [history, { data: listableCards }] = await Promise.all([
    getSoldHistory(supabase),
    supabase
      .from("cards")
      .select("id, title, price_cad, quantity, status")
      .in("status", ["available", "reserved", "draft"])
      .order("title", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Sales history</h2>
        <p className="mt-1 text-sm text-muted">
          Site orders and private sales (Facebook, in-person, etc.). Collectr sync can
          re-list the same card when it reappears in your portfolio — remove sold copies
          from Collectr after each sale.
        </p>
      </div>

      <RecordPrivateSaleForm cards={listableCards ?? []} />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Card</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {new Date(row.soldAt).toLocaleString("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3 font-medium">{row.title}</td>
                <td className="px-4 py-3">
                  {row.priceCad != null ? formatCad(row.priceCad) : "—"}
                </td>
                <td className="px-4 py-3">{row.quantity}</td>
                <td className="px-4 py-3 capitalize">
                  {row.source === "site" ? "Pokellection" : "Private"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {row.source === "site" && row.orderNumber && (
                    <Link
                      href={`/admin/orders/${row.orderId}`}
                      className="font-medium text-primary"
                    >
                      Order {row.orderNumber}
                    </Link>
                  )}
                  {row.source === "private" && (
                    <span>
                      {row.buyerName && <span>{row.buyerName}</span>}
                      {row.note && (
                        <span className={row.buyerName ? " · " : ""}>{row.note}</span>
                      )}
                      {!row.buyerName && !row.note && "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No sales recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
