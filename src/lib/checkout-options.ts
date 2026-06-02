/** Ottawa-local checkout fulfillment (America/Toronto). */

export const OTTAWA_TIMEZONE = "America/Toronto";

export const CANADA_SHIP_MIN_FEE_CAD = 20;
export const SAME_DAY_PICKUP_SURCHARGE_CAD = 5;

export const NEXT_DAY_PICKUP_CUTOFF_MINUTES = 22 * 60 + 30; // 10:30 PM
export const NEXT_DAY_DELIVERY_CUTOFF_MINUTES = 23 * 60; // 11:00 PM
export const SAME_DAY_PICKUP_START_MINUTES = 17 * 60; // 5:00 PM

export const FULFILLMENT_OPTIONS = [
  "canada_ship",
  "next_day_pickup",
  "same_day_pickup",
  "next_day_delivery",
] as const;

export type FulfillmentOption = (typeof FULFILLMENT_OPTIONS)[number];

export const DELIVERY_AREAS = [
  { id: "findlay_creek", label: "Findlay Creek", feeCad: 5 },
  { id: "south_keys", label: "South Keys", feeCad: 10 },
  { id: "downtown", label: "Downtown", feeCad: 15 },
  { id: "orleans", label: "Orleans", feeCad: 15 },
  { id: "barrhaven", label: "Barrhaven", feeCad: 20 },
  { id: "rockland", label: "Rockland", feeCad: 25 },
] as const;

export type DeliveryAreaId = (typeof DELIVERY_AREAS)[number]["id"];

export type OptionAvailability = {
  available: boolean;
  reason?: string;
};

export function getOttawaMinutesNow(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OTTAWA_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function getCheckoutOptionAvailability(
  now = new Date(),
): Record<FulfillmentOption, OptionAvailability> {
  const minutes = getOttawaMinutesNow(now);

  return {
    canada_ship: { available: true },
    next_day_pickup: {
      available: minutes < NEXT_DAY_PICKUP_CUTOFF_MINUTES,
      reason:
        minutes >= NEXT_DAY_PICKUP_CUTOFF_MINUTES
          ? "Orders for next-day pickup close at 10:30 PM."
          : undefined,
    },
    same_day_pickup: {
      available: minutes >= SAME_DAY_PICKUP_START_MINUTES,
      reason:
        minutes < SAME_DAY_PICKUP_START_MINUTES
          ? "Same-day pickup opens at 5:00 PM (+$5)."
          : undefined,
    },
    next_day_delivery: {
      available: minutes < NEXT_DAY_DELIVERY_CUTOFF_MINUTES,
      reason:
        minutes >= NEXT_DAY_DELIVERY_CUTOFF_MINUTES
          ? "Orders for next-day delivery close at 11:00 PM."
          : undefined,
    },
  };
}

export function isFulfillmentOption(value: string): value is FulfillmentOption {
  return (FULFILLMENT_OPTIONS as readonly string[]).includes(value);
}

export function isDeliveryAreaId(value: string): value is DeliveryAreaId {
  return DELIVERY_AREAS.some((area) => area.id === value);
}

export function getDeliveryArea(areaId: DeliveryAreaId) {
  return DELIVERY_AREAS.find((area) => area.id === areaId);
}

export function fulfillmentTypeForOption(
  option: FulfillmentOption,
): "pickup" | "ship" {
  return option === "canada_ship" ? "ship" : "pickup";
}

export function requiresFullAddress(option: FulfillmentOption): boolean {
  return option === "canada_ship" || option === "next_day_delivery";
}

export function requiresDeliveryArea(option: FulfillmentOption): boolean {
  return option === "next_day_delivery";
}

export function calculateShippingFeeCad(
  option: FulfillmentOption,
  deliveryAreaId?: string | null,
): number | null {
  switch (option) {
    case "canada_ship":
      return CANADA_SHIP_MIN_FEE_CAD;
    case "next_day_pickup":
      return 0;
    case "same_day_pickup":
      return SAME_DAY_PICKUP_SURCHARGE_CAD;
    case "next_day_delivery": {
      if (!deliveryAreaId || !isDeliveryAreaId(deliveryAreaId)) return null;
      return getDeliveryArea(deliveryAreaId)?.feeCad ?? null;
    }
    default:
      return null;
  }
}

const UNAVAILABLE_ERROR_CODE: Record<FulfillmentOption, string> = {
  canada_ship: "option_unavailable",
  next_day_pickup: "next_day_pickup_closed",
  same_day_pickup: "same_day_pickup_unavailable",
  next_day_delivery: "next_day_delivery_closed",
};

export function validateCheckoutSelection(
  option: FulfillmentOption,
  deliveryAreaId: string | null,
  address: { street: string; city: string; province: string; postalCode: string },
  now = new Date(),
): { ok: true; feeCad: number } | { ok: false; error: string } {
  const availability = getCheckoutOptionAvailability(now)[option];
  if (!availability.available) {
    return { ok: false, error: UNAVAILABLE_ERROR_CODE[option] };
  }

  const fee = calculateShippingFeeCad(option, deliveryAreaId);
  if (fee === null) {
    return { ok: false, error: "missing_delivery_area" };
  }

  if (requiresFullAddress(option)) {
    if (!address.street.trim() || !address.city.trim() || !address.postalCode.trim()) {
      return { ok: false, error: "missing_address" };
    }
  }

  if (requiresDeliveryArea(option) && (!deliveryAreaId || !isDeliveryAreaId(deliveryAreaId))) {
    return { ok: false, error: "missing_delivery_area" };
  }

  return { ok: true, feeCad: fee };
}

export function formatFulfillmentOptionLabel(
  option: string | null,
  shippingAddress: { delivery_area?: string } | null,
): string {
  switch (option) {
    case "canada_ship":
      return "Ship (Canada) — next business day";
    case "next_day_pickup":
      return "Next-day pickup";
    case "same_day_pickup":
      return "Same-day pickup (+$5)";
    case "next_day_delivery": {
      const areaId = shippingAddress?.delivery_area;
      const area = areaId && isDeliveryAreaId(areaId) ? getDeliveryArea(areaId) : null;
      return area
        ? `Next-day delivery — ${area.label}`
        : "Next-day delivery";
    }
    case null:
      return "Legacy shipping";
    default:
      return option;
  }
}

export const CHECKOUT_OPTION_DETAILS: Record<
  FulfillmentOption,
  { title: string; description: string }
> = {
  canada_ship: {
    title: "Ship",
    description:
      "Cards ship next business day anywhere in Canada. $20 minimum shipping per order.",
  },
  next_day_pickup: {
    title: "Next-day pickup",
    description: "Pick up in Ottawa the next day. Order by 10:30 PM the day before pickup.",
  },
  same_day_pickup: {
    title: "Same-day pickup",
    description:
      "Available after 5:00 PM only. Additional $5. Pick up the same evening.",
  },
  next_day_delivery: {
    title: "Next-day delivery",
    description:
      "Local delivery in Ottawa area. Order by 11:00 PM for next-day delivery.",
  },
};
