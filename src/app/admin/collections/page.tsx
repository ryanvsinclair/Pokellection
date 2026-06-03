import Link from "next/link";
import { getAllCollections } from "@/lib/queries/collections";
import { createClient } from "@/lib/supabase/server";
import { formatCad } from "@/lib/utils";

export default async function AdminCollectionsPage() {
  const supabase = await createClient();
  const collections = await getAllCollections(supabase);

  const counts = await Promise.all(
    collections.map(async (collection) => {
      const { count } = await supabase
        .from("collection_cards")
        .select("card_id", { count: "exact", head: true })
        .eq("collection_id", collection.id);
      return { id: collection.id, count: count ?? 0 };
    }),
  );
  const countMap = Object.fromEntries(counts.map((row) => [row.id, row.count]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Collections</h2>
          <p className="text-sm text-muted">
            Bundle chosen cards at one price for buyers.
          </p>
        </div>
        <Link
          href="/admin/collections/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          New collection
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Cards</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id} className="border-b border-border last:border-none">
                <td className="px-4 py-3 font-medium">{collection.title}</td>
                <td className="px-4 py-3">{formatCad(collection.price_cad)}</td>
                <td className="px-4 py-3">{countMap[collection.id] ?? 0}</td>
                <td className="px-4 py-3 capitalize">{collection.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/collections/${collection.id}/edit`} className="text-primary">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No collections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
