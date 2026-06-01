import { CardForm } from "@/components/admin/CardForm";

export default function NewCardPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold">Add a card</h2>
      <CardForm />
    </div>
  );
}
