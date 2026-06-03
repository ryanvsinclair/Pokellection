import Link from "next/link";
import { AdminCardsTable } from "@/components/admin/AdminCardsTable";
import { createClient } from "@/lib/supabase/server";

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
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Add card
        </Link>
      </div>

      <AdminCardsTable cards={cards ?? []} />
    </div>
  );
}
