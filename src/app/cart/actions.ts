"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canIncreaseCartQuantity } from "@/lib/cart-inventory";
import {
  fulfillmentTypeForOption,
  isFulfillmentOption,
  validateCheckoutSelection,
} from "@/lib/checkout-options";
import { getCartItemCount } from "@/lib/queries/cart";
import { generateOrderNumber } from "@/lib/tracking";
import { createClient } from "@/lib/supabase/server";

export type AddToCartResult =
  | { ok: true; count: number; lineQuantity: number }
  | {
      ok: false;
      error: "missing_card" | "auth" | "failed" | "unavailable" | "max_quantity";
      stockQuantity?: number;
      inCartQuantity?: number;
    };

function revalidateCartSurfaces() {
  revalidatePath("/checkout");
  revalidatePath("/shop");
}

export async function addToCartAction(
  _prev: AddToCartResult | null,
  formData: FormData,
): Promise<AddToCartResult> {
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return { ok: false, error: "missing_card" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "auth" };
    }

    const { data: card } = await supabase
      .from("cards")
      .select("quantity, status")
      .eq("id", cardId)
      .maybeSingle();

    if (!card || card.status !== "available" || card.quantity < 1) {
      return { ok: false, error: "unavailable" };
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("card_id", cardId)
      .maybeSingle();

    const inCart = existing?.quantity ?? 0;
    if (!canIncreaseCartQuantity(card.quantity, inCart)) {
      return {
        ok: false,
        error: "max_quantity",
        stockQuantity: card.quantity,
        inCartQuantity: inCart,
      };
    }

    const lineQuantity = inCart + 1;

    if (existing) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: lineQuantity })
        .eq("id", existing.id);
      if (error) return { ok: false, error: "failed" };
    } else {
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        card_id: cardId,
        quantity: lineQuantity,
      });
      if (error) return { ok: false, error: "failed" };
    }

    const count = await getCartItemCount(supabase, user.id);
    return { ok: true, count, lineQuantity };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function updateCartQuantity(formData: FormData) {
  const cartItemId = String(formData.get("cart_item_id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!cartItemId || quantity < 1) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/checkout");

  const { data: cartItem } = await supabase
    .from("cart_items")
    .select("card_id")
    .eq("id", cartItemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cartItem) return;

  const { data: card } = await supabase
    .from("cards")
    .select("quantity, status")
    .eq("id", cartItem.card_id)
    .maybeSingle();

  if (!card || card.status !== "available") {
    redirect("/checkout?error=unavailable");
  }

  const cappedQuantity = Math.min(quantity, card.quantity);

  await supabase
    .from("cart_items")
    .update({ quantity: cappedQuantity })
    .eq("id", cartItemId)
    .eq("user_id", user.id);

  revalidateCartSurfaces();
  if (quantity > card.quantity) {
    redirect("/checkout?error=max_quantity");
  }
}

export async function removeFromCart(formData: FormData) {
  const cartItemId = String(formData.get("cart_item_id") ?? "");
  if (!cartItemId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/checkout");

  await supabase.from("cart_items").delete().eq("id", cartItemId).eq("user_id", user.id);
  revalidateCartSurfaces();
}

export async function placeOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/checkout");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", user.id)
    .single();

  const fulfillmentOptionRaw = String(formData.get("fulfillment_option") ?? "");
  if (!isFulfillmentOption(fulfillmentOptionRaw)) {
    redirect("/checkout?error=invalid_option");
  }

  const buyerName = String(formData.get("buyer_name") ?? profile?.display_name ?? "");
  const buyerPhone = String(formData.get("buyer_phone") ?? profile?.phone ?? "");
  const street = String(formData.get("street") ?? "");
  const city = String(formData.get("city") ?? "");
  const province = String(formData.get("province") ?? "ON");
  const postalCode = String(formData.get("postal_code") ?? "");
  const deliveryArea = String(formData.get("delivery_area") ?? "") || null;

  const checkoutValidation = validateCheckoutSelection(
    fulfillmentOptionRaw,
    deliveryArea,
    { street, city, province, postalCode },
  );
  if (!checkoutValidation.ok) {
    redirect(`/checkout?error=${checkoutValidation.error}`);
  }

  const shippingFee = checkoutValidation.feeCad;
  const fulfillmentType = fulfillmentTypeForOption(fulfillmentOptionRaw);

  const { data: cartRows } = await supabase
    .from("cart_items")
    .select("id, quantity, card_id")
    .eq("user_id", user.id);

  if (!cartRows?.length) {
    redirect("/checkout");
  }

  const cardIds = cartRows.map((row) => row.card_id);
  const { data: cards } = await supabase.from("cards").select("*").in("id", cardIds);
  const cardMap = new Map((cards ?? []).map((card) => [card.id, card]));

  const overStock = cartRows.some((row) => {
    const card = cardMap.get(row.card_id);
    return card && row.quantity > card.quantity;
  });
  if (overStock) {
    redirect("/checkout?error=max_quantity");
  }

  const lineItems = cartRows
    .map((row) => {
      const card = cardMap.get(row.card_id);
      if (!card || card.status !== "available" || row.quantity > card.quantity) return null;
      return { cartItemId: row.id, card, quantity: row.quantity };
    })
    .filter(Boolean) as {
    cartItemId: string;
    card: {
      id: string;
      title: string;
      price_cad: number;
      status: string;
    };
    quantity: number;
  }[];

  if (lineItems.length === 0) {
    redirect("/checkout?error=unavailable");
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + Number(item.card.price_cad) * item.quantity,
    0,
  );
  const total = subtotal + shippingFee;
  const orderNumber = generateOrderNumber();

  const shippingAddress =
    fulfillmentOptionRaw === "canada_ship" || fulfillmentOptionRaw === "next_day_delivery"
      ? {
          street,
          city,
          province,
          postal_code: postalCode,
          ...(fulfillmentOptionRaw === "next_day_delivery" && deliveryArea
            ? { delivery_area: deliveryArea }
            : {}),
        }
      : null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      buyer_id: user.id,
      buyer_email: user.email ?? "",
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      fulfillment_type: fulfillmentType,
      fulfillment_option: fulfillmentOptionRaw,
      shipping_method: null,
      shipping_fee_cad: shippingFee,
      subtotal_cad: subtotal,
      total_cad: total,
      shipping_address: shippingAddress,
      payment_method: "etransfer",
      payment_status: "awaiting_transfer",
      fulfillment_status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    redirect("/checkout?error=order");
  }

  await supabase.from("order_items").insert(
    lineItems.map((item) => ({
      order_id: order.id,
      card_id: item.card.id,
      title_snapshot: item.card.title,
      price_snapshot: item.card.price_cad,
      quantity: item.quantity,
    })),
  );

  for (const item of lineItems) {
    await supabase.from("cards").update({ status: "reserved" }).eq("id", item.card.id);
  }

  await supabase.from("cart_items").delete().eq("user_id", user.id);

  revalidateCartSurfaces();
  revalidatePath("/account/orders");

  redirect(`/account/orders/${orderNumber}`);
}
