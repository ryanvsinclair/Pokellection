"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  reserveCardForPickupAction,
  type ReserveCardResult,
} from "@/app/reserve/[id]/actions";

interface Props {
  cardId: string;
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
}

const initialState: ReserveCardResult | null = null;

export function ReservePickupForm({
  cardId,
  defaultName,
  defaultEmail,
  defaultPhone,
}: Props) {
  const [state, formAction] = useActionState(reserveCardForPickupAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <input type="hidden" name="card_id" value={cardId} />
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          name="buyer_name"
          required
          defaultValue={defaultName}
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          name="buyer_email"
          type="email"
          required
          readOnly
          defaultValue={defaultEmail}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-muted"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Phone</span>
        <input
          name="buyer_phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Notes (optional)</span>
        <textarea name="notes" rows={2} className="w-full rounded-lg border border-border px-3 py-2" />
      </label>

      {state && !state.ok && <p className="text-sm text-primary">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Reserving…" : "Reserve card"}
    </button>
  );
}
