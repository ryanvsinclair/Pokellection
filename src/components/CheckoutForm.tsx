"use client";

import { useMemo, useState } from "react";
import { placeOrder } from "@/app/cart/actions";
import {
  calculateShippingFeeCad,
  CHECKOUT_OPTION_DETAILS,
  DELIVERY_AREAS,
  type FulfillmentOption,
  type OptionAvailability,
  requiresDeliveryArea,
  requiresFullAddress,
} from "@/lib/checkout-options";
import { SupportContact } from "@/components/SupportContact";
import { formatCad } from "@/lib/utils";

interface Props {
  subtotalCad: number;
  defaultName: string;
  defaultPhone: string;
  availability: Record<FulfillmentOption, OptionAvailability>;
}

const OPTION_ORDER: FulfillmentOption[] = [
  "canada_ship",
  "next_day_pickup",
  "same_day_pickup",
  "next_day_delivery",
];

function firstAvailableOption(
  availability: Record<FulfillmentOption, OptionAvailability>,
): FulfillmentOption {
  return (
    OPTION_ORDER.find((id) => availability[id].available) ?? "canada_ship"
  );
}

export function CheckoutForm({
  subtotalCad,
  defaultName,
  defaultPhone,
  availability,
}: Props) {
  const [option, setOption] = useState<FulfillmentOption>(() =>
    firstAvailableOption(availability),
  );
  const [deliveryArea, setDeliveryArea] = useState<string>(DELIVERY_AREAS[0].id);

  const needsAddress = requiresFullAddress(option);
  const needsArea = requiresDeliveryArea(option);

  const shippingFee = useMemo(
    () => calculateShippingFeeCad(option, needsArea ? deliveryArea : null) ?? 0,
    [option, deliveryArea, needsArea],
  );

  const total = subtotalCad + shippingFee;

  return (
    <form action={placeOrder} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Fulfillment</h2>

      <fieldset className="space-y-3 text-sm">
        <legend className="sr-only">Choose fulfillment option</legend>
        {OPTION_ORDER.map((id) => {
          const meta = CHECKOUT_OPTION_DETAILS[id];
          const avail = availability[id];
          const fee = calculateShippingFeeCad(
            id,
            id === "next_day_delivery" ? deliveryArea : null,
          );
          const feeLabel =
            fee === null
              ? ""
              : fee === 0
                ? " — Free"
                : ` — ${formatCad(fee)}`;

          return (
            <label
              key={id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                option === id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted"
              } ${!avail.available ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="fulfillment_option"
                value={id}
                checked={option === id}
                disabled={!avail.available}
                onChange={() => setOption(id)}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium">
                  {meta.title}
                  {feeLabel}
                </span>
                <span className="mt-0.5 block text-muted">{meta.description}</span>
                {!avail.available && avail.reason && (
                  <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">
                    {avail.reason}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      {needsArea && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Delivery area</span>
          <select
            name="delivery_area"
            value={deliveryArea}
            onChange={(e) => setDeliveryArea(e.target.value as typeof deliveryArea)}
            required
            className="w-full rounded-lg border border-border px-3 py-2"
          >
            {DELIVERY_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label} — {formatCad(area.feeCad)}
              </option>
            ))}
          </select>
        </label>
      )}

      <h2 className="pt-2 font-semibold">Contact</h2>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Full name</span>
        <input
          name="buyer_name"
          required
          defaultValue={defaultName}
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Phone</span>
        <input
          name="buyer_phone"
          required
          defaultValue={defaultPhone}
          className="w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      {needsAddress && (
        <>
          <h2 className="pt-2 font-semibold">
            {option === "next_day_delivery" ? "Delivery address" : "Shipping address"}
          </h2>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Street address</span>
            <input
              name="street"
              required={needsAddress}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">City</span>
              <input
                name="city"
                required={needsAddress}
                defaultValue={option === "canada_ship" ? "" : "Ottawa"}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Province</span>
              <input
                name="province"
                defaultValue="ON"
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Postal code</span>
            <input
              name="postal_code"
              required={needsAddress}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </>
      )}

      <div className="space-y-1 border-t border-border pt-4 text-sm">
        <p className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span>{formatCad(subtotalCad)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted">Fees</span>
          <span>{formatCad(shippingFee)}</span>
        </p>
        <p className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCad(total)}</span>
        </p>
      </div>

      <p className="text-xs text-muted">
        Pay by e-transfer after placing your order. All times are Ottawa (ET).
      </p>

      <SupportContact className="rounded-lg border border-border bg-surface px-3 py-3" />

      <button
        type="submit"
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white"
      >
        Place order (e-transfer)
      </button>
    </form>
  );
}
