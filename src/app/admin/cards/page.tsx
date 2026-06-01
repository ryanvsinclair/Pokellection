import Link from "next/link";
import { deleteCard, setCardStatus } from "@/app/admin/cards/actions";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

export default async function AdminCardsPage() {
  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin/cards/new"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add card
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(cards ?? []).map((card) => (
              <tr key={card.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{card.title}</td>
                <td className="px-4 py-3">{formatCad(card.price_cad)}</td>
                <td className="px-4 py-3 capitalize">{card.status}</td>
                <td className="px-4 py-3">{card.quantity}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/cards/${card.id}/edit`}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium"
                    >
                      Edit
                    </Link>
                    {card.status !== "sold" && (
                      <form action={setCardStatus}>
                        <input type="hidden" name="card_id" value={card.id} />
                        <input type="hidden" name="status" value="sold" />
                        <button
                          type="submit"
                          className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                        >
                          Mark sold
                        </button>
                      </form>
                    )}
                    {card.status !== "draft" && (
                      <form action={setCardStatus}>
                        <input type="hidden" name="card_id" value={card.id} />
                        <input type="hidden" name="status" value="draft" />
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2 py-1 text-xs font-medium"
                        >
                          Unlist
                        </button>
                      </form>
                    )}
                    <form action={deleteCard}>
                      <input type="hidden" name="card_id" value={card.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(cards ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No cards yet. Add your first card or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
