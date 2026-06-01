import { notFound } from "next/navigation";
import { saveCardEdits } from "@/app/admin/cards/actions";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCardPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: card } = await supabase.from("cards").select("*").eq("id", id).single();

  if (!card) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold">Edit listing</h2>

      <form action={saveCardEdits} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <input type="hidden" name="card_id" value={card.id} />

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Title</span>
          <input
            name="title"
            required
            defaultValue={card.title}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Set</span>
            <input
              name="set_name"
              defaultValue={card.set_name ?? ""}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Card number</span>
            <input
              name="card_number"
              defaultValue={card.card_number ?? ""}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Condition</span>
            <select
              name="condition"
              defaultValue={card.condition}
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              {["NM", "LP", "MP", "HP", "DMG"].map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Price (CAD)</span>
            <input
              name="price_cad"
              type="number"
              step="0.01"
              min="0"
              defaultValue={card.price_cad}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Quantity</span>
            <input
              name="quantity"
              type="number"
              min="0"
              defaultValue={card.quantity}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Rarity</span>
          <input
            name="rarity"
            defaultValue={card.rarity ?? ""}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            name="status"
            defaultValue={card.status}
            className="w-full rounded-lg border border-border px-3 py-2"
          >
            {["available", "reserved", "sold", "draft"].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={card.description ?? ""}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
