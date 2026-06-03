"use client";

import { useMemo, useState } from "react";
import { placeOrder } from "@/app/cart/actions";
import {
  calculateShippingFeeCad,
  CHECKOUT_OPTION_DETAILS,
  DELIVERY_AREAS,
  type FulfillmentOption,
  type OptionAvailability,
  PICKUP_AREAS,
  requiresDeliveryArea,
  requiresFullAddress,
  requiresPickupArea,
  getOrderPaymentSplit,
  isNextDayDeliveryOption,
  NEXT_DAY_DELIVERY_DEPOSIT_CAD,
  requiresPrepayEtransfer,
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
  const [pickupArea, setPickupArea] = useState<string>(PICKUP_AREAS[0].id);

  const needsAddress = requiresFullAddress(option);
  const needsDeliveryArea = requiresDeliveryArea(option);
  const needsPickupArea = requiresPickupArea(option);

  const areaSelection = useMemo(
    () => ({
      deliveryAreaId: needsDeliveryArea ? deliveryArea : null,
      pickupAreaId: needsPickupArea ? pickupArea : null,
    }),
    [needsDeliveryArea, needsPickupArea, deliveryArea, pickupArea],
  );

  const shippingFee = useMemo(
    () => calculateShippingFeeCad(option, areaSelection) ?? 0,
    [option, areaSelection],
  );

  const total = subtotalCad + shippingFee;
  const prepay = requiresPrepayEtransfer(option);
  const deliveryDeposit = isNextDayDeliveryOption(option);
  const { depositCad, balanceDueCad } = getOrderPaymentSplit(option, total);
  const [pricingReviewRequested, setPricingReviewRequested] = useState(false);
  const showPricingReview = option === "canada_ship";

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
            id === "next_day_delivery"
              ? { deliveryAreaId: deliveryArea }
              : id === "next_day_pickup"
                ? { pickupAreaId: pickupArea }
                : {},
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

      {needsPickupArea && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Pickup area</span>
          <select
            name="pickup_area"
            value={pickupArea}
            onChange={(e) => setPickupArea(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2"
          >
            {PICKUP_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {needsDeliveryArea && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Delivery area</span>
          <select
            name="delivery_area"
            value={deliveryArea}
            onChange={(e) => setDeliveryArea(e.target.value)}
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
        <p className="flex justify-between font-medium">
          <span>Order total</span>
          <span>{formatCad(total)}</span>
        </p>
        {deliveryDeposit && (
          <>
            <p className="flex justify-between border-t border-border pt-2 text-amber-800 dark:text-amber-300">
              <span>Deposit due now (non-refundable)</span>
              <span>{formatCad(depositCad)}</span>
            </p>
            <p className="flex justify-between text-muted">
              <span>Balance on delivery</span>
              <span>{formatCad(balanceDueCad ?? 0)}</span>
            </p>
          </>
        )}
      </div>

      <p className="text-xs text-muted">
        {deliveryDeposit
          ? `Send a ${formatCad(NEXT_DAY_DELIVERY_DEPOSIT_CAD)} e-transfer deposit after placing your order to confirm delivery. The deposit is non-refundable if you cancel or no-show. Pay the remaining balance on delivery. Ottawa (ET) cutoffs apply.`
          : prepay
            ? "Pay by e-transfer after placing your order. All times are Ottawa (ET)."
            : "Pay with cash or e-transfer when you pick up — no payment needed before arrival. All times are Ottawa (ET)."}
      </p>

      {showPricingReview && (
        <fieldset className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
          <legend className="font-semibold text-foreground">Market pricing</legend>
          <p className="text-muted">
            Listed prices reflect TCGPlayer market values when each card was published. If
            market prices have dropped, you can ask us to review your order total before you
            send your e-transfer.
          </p>
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              name="pricing_review_requested"
              value="1"
              checked={pricingReviewRequested}
              onChange={(e) => setPricingReviewRequested(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Request a price review before I pay</span>
              <span className="mt-0.5 block text-muted">
                We will confirm your updated total on the order page. Do not e-transfer until
                you see payment instructions with the final amount.
              </span>
            </span>
          </label>
          {pricingReviewRequested && (
            <label className="block space-y-1">
              <span className="font-medium">Message (optional)</span>
              <textarea
                name="pricing_review_message"
                rows={3}
                maxLength={2000}
                placeholder="e.g. TCGPlayer NM price for Charizard ex is lower than listed"
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
          )}
        </fieldset>
      )}

      <SupportContact className="rounded-lg border border-border bg-surface px-3 py-3" />

      <button
        type="submit"
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white"
      >
        {deliveryDeposit
          ? `Place order (${formatCad(depositCad)} deposit)`
          : prepay
            ? pricingReviewRequested && showPricingReview
              ? "Place order (price review)"
              : "Place order (e-transfer)"
            : "Place order"}
      </button>
    </form>
  );
}
