import {
  getOrderPaymentSplit,
  isNextDayDeliveryOption,
  isStorePickupOption,
  requiresPrepayEtransfer,
  type FulfillmentOption,
} from "@/lib/checkout-options";
import type { Order, PaymentMethod, PaymentStatus } from "@/types/database";

export type OrderPaymentFields = Pick<
  Order,
  | "fulfillment_option"
  | "payment_method"
  | "payment_status"
  | "total_cad"
  | "deposit_cad"
  | "balance_due_cad"
>;

export function orderPaymentMethodForFulfillment(
  option: FulfillmentOption,
): PaymentMethod {
  return requiresPrepayEtransfer(option) ? "etransfer" : "cash_on_pickup";
}

export function orderRequiresPrepayEtransfer(
  order: Pick<Order, "fulfillment_option" | "payment_method">,
): boolean {
  if (order.payment_method === "etransfer") return true;
  if (order.payment_method === "cash_on_pickup") return false;
  const option = order.fulfillment_option;
  return option != null && !isStorePickupOption(option as FulfillmentOption);
}

export function orderHasDeliveryDeposit(
  order: Pick<Order, "fulfillment_option" | "deposit_cad">,
): boolean {
  const option = order.fulfillment_option as FulfillmentOption | null;
  return (
    option != null &&
    isNextDayDeliveryOption(option) &&
    Number(order.deposit_cad) > 0
  );
}

/** Amount the buyer should e-transfer now (deposit or full total). */
export function getEtransferAmountDueNow(order: OrderPaymentFields): number {
  if (!orderRequiresPrepayEtransfer(order)) return 0;
  if (order.payment_status === "received" || order.payment_status === "refunded") {
    return 0;
  }
  if (order.payment_status === "deposit_received") return 0;

  if (orderHasDeliveryDeposit(order)) {
    return Number(order.deposit_cad);
  }

  return Number(order.total_cad);
}

export function getBalanceDueOnDelivery(order: OrderPaymentFields): number {
  if (!orderHasDeliveryDeposit(order)) return 0;
  if (order.payment_status === "received") return 0;
  return Number(order.balance_due_cad ?? 0);
}

export function formatPaymentStatusLabel(
  status: PaymentStatus,
  paymentMethod: PaymentMethod,
  order?: Pick<Order, "fulfillment_option" | "deposit_cad">,
): string {
  if (status === "awaiting_transfer" && paymentMethod === "cash_on_pickup") {
    return "Pay on pickup";
  }
  if (status === "deposit_received") {
    return "Deposit received";
  }
  if (
    status === "awaiting_transfer" &&
    order &&
    orderHasDeliveryDeposit(order as OrderPaymentFields)
  ) {
    return "Awaiting deposit";
  }
  return status.replace(/_/g, " ");
}

export function buildOrderPaymentAmounts(
  option: FulfillmentOption,
  totalCad: number,
): { deposit_cad: number; balance_due_cad: number | null } {
  const { depositCad, balanceDueCad } = getOrderPaymentSplit(option, totalCad);
  return {
    deposit_cad: depositCad,
    balance_due_cad: balanceDueCad,
  };
}
