"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicCatalogSeo } from "@/lib/seo-revalidate";
import { redirect } from "next/navigation";
import { canIncreaseCartQuantity } from "@/lib/cart-inventory";
import {
  fulfillmentTypeForOption,
  isFulfillmentOption,
  validateCheckoutSelection,
} from "@/lib/checkout-options";
import { normalizePricingReviewMessage } from "@/lib/order-pricing-review";
import { buildOrderPaymentAmounts, orderPaymentMethodForFulfillment } from "@/lib/order-payment";
import { markCardSoldUpdate } from "@/lib/card-sold";
import { collectionSinglePriceCad } from "@/lib/collection-pricing";
import { detachCardFromPublishedCollection } from "@/lib/collection-fulfillment";
import { getCartItemCount } from "@/lib/queries/cart";
import { generateOrderNumber } from "@/lib/tracking";
import { getUserProfileRole, isBuyer } from "@/lib/auth-roles";
import { buyerSignupPath } from "@/lib/buyer-auth-paths";
import { sendOrderPlacedEmails } from "@/lib/email/order-placed";
import { createClient } from "@/lib/supabase/server";

export type AddToCartResult =
  | { ok: true; count: number; lineQuantity: number }
  | {
      ok: false;
      error: "missing_card" | "auth" | "failed" | "unavailable" | "max_quantity";
      stockQuantity?: number;
      inCartQuantity?: number;
    };

export type AddCollectionToCartResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: "missing_collection" | "auth" | "failed" | "unavailable" | "conflict";
    };

export type AddCollectionSingleToCartResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error:
        | "missing"
        | "auth"
        | "failed"
        | "unavailable"
        | "conflict"
        | "in_cart";
    };

function revalidateCartSurfaces() {
  revalidatePath("/checkout");
  revalidatePath("/shop");
  revalidatePath("/collections");
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

export async function addCollectionToCartAction(
  _prev: AddCollectionToCartResult | null,
  formData: FormData,
): Promise<AddCollectionToCartResult> {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) return { ok: false, error: "missing_collection" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "auth" };
    }

    const { data: collection } = await supabase
      .from("collections")
      .select("id, status")
      .eq("id", collectionId)
      .maybeSingle();

    if (!collection || collection.status !== "available") {
      return { ok: false, error: "unavailable" };
    }

    const { data: conflictingSingles } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("from_collection_id", collectionId)
      .limit(1);

    if (conflictingSingles?.length) {
      return { ok: false, error: "conflict" };
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("collection_id", collectionId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        collection_id: collectionId,
        quantity: 1,
      });
      if (error) return { ok: false, error: "failed" };
    }

    const count = await getCartItemCount(supabase, user.id);
    return { ok: true, count };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function addCollectionSingleToCartAction(
  _prev: AddCollectionSingleToCartResult | null,
  formData: FormData,
): Promise<AddCollectionSingleToCartResult> {
  const cardId = String(formData.get("card_id") ?? "");
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!cardId || !collectionId) return { ok: false, error: "missing" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "auth" };

    const { data: bundleLine } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("collection_id", collectionId)
      .maybeSingle();

    if (bundleLine) return { ok: false, error: "conflict" };

    const { data: collection } = await supabase
      .from("collections")
      .select("id, status")
      .eq("id", collectionId)
      .maybeSingle();

    if (!collection || collection.status !== "available") {
      return { ok: false, error: "unavailable" };
    }

    const { data: link } = await supabase
      .from("collection_cards")
      .select("card_id")
      .eq("collection_id", collectionId)
      .eq("card_id", cardId)
      .maybeSingle();

    if (!link) return { ok: false, error: "unavailable" };

    const { data: card } = await supabase
      .from("cards")
      .select("quantity, status")
      .eq("id", cardId)
      .maybeSingle();

    if (!card || card.status !== "reserved" || card.quantity < 1) {
      return { ok: false, error: "unavailable" };
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("card_id", cardId)
      .maybeSingle();

    if (existing) return { ok: false, error: "in_cart" };

    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      card_id: cardId,
      from_collection_id: collectionId,
      quantity: 1,
    });

    if (error) return { ok: false, error: "failed" };

    const count = await getCartItemCount(supabase, user.id);
    return { ok: true, count };
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
    .select("card_id, collection_id, from_collection_id")
    .eq("id", cartItemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cartItem?.card_id || cartItem.collection_id) return;

  if (cartItem.from_collection_id) {
    redirect("/checkout?error=collection_single_qty");
  }

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

async function requireBuyerUser(supabase: Awaited<ReturnType<typeof createClient>>, returnPath: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(buyerSignupPath(returnPath));
  const role = await getUserProfileRole(supabase, user.id);
  if (!isBuyer(role)) redirect("/account");
  return user;
}

export async function placeOrder(formData: FormData) {
  const supabase = await createClient();
  const user = await requireBuyerUser(supabase, "/checkout");

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
  const pickupArea = String(formData.get("pickup_area") ?? "") || null;

  const checkoutValidation = validateCheckoutSelection(
    fulfillmentOptionRaw,
    { deliveryAreaId: deliveryArea, pickupAreaId: pickupArea },
    { street, city, province, postalCode },
  );
  if (!checkoutValidation.ok) {
    redirect(`/checkout?error=${checkoutValidation.error}`);
  }

  const shippingFee = checkoutValidation.feeCad;
  const fulfillmentType = fulfillmentTypeForOption(fulfillmentOptionRaw);

  const { data: cartRows } = await supabase
    .from("cart_items")
    .select("id, quantity, card_id, collection_id, from_collection_id")
    .eq("user_id", user.id);

  if (!cartRows?.length) {
    redirect("/checkout");
  }

  const cardRowsOnly = cartRows.filter((row) => row.card_id && !row.collection_id);
  const collectionRowsOnly = cartRows.filter((row) => row.collection_id);
  const shopCardRows = cardRowsOnly.filter((row) => !row.from_collection_id);
  const collectionSingleRows = cardRowsOnly.filter((row) => row.from_collection_id);

  const bundleCollectionIds = new Set(
    collectionRowsOnly.map((row) => row.collection_id).filter(Boolean) as string[],
  );
  const singlesConflictBundle = collectionSingleRows.some(
    (row) => row.from_collection_id && bundleCollectionIds.has(row.from_collection_id),
  );
  if (singlesConflictBundle) {
    redirect("/checkout?error=collection_conflict");
  }

  const cardIds = cardRowsOnly.map((row) => row.card_id).filter(Boolean) as string[];
  const { data: cards } = cardIds.length
    ? await supabase.from("cards").select("*").in("id", cardIds)
    : { data: [] };
  const cardMap = new Map((cards ?? []).map((card) => [card.id, card]));

  const overStock = shopCardRows.some((row) => {
    const card = row.card_id ? cardMap.get(row.card_id) : null;
    return card && row.quantity > card.quantity;
  });
  if (overStock) {
    redirect("/checkout?error=max_quantity");
  }

  const cardLineItems = shopCardRows
    .map((row) => {
      if (!row.card_id) return null;
      const card = cardMap.get(row.card_id);
      if (!card || card.status !== "available" || row.quantity > card.quantity) return null;
      return { cartItemId: row.id, card, quantity: row.quantity, fromCollectionId: null as string | null };
    })
    .filter(Boolean) as {
    cartItemId: string;
    card: { id: string; title: string; price_cad: number; status: string };
    quantity: number;
    fromCollectionId: string | null;
  }[];

  const collectionSingleLineItems: {
    cartItemId: string;
    card: { id: string; title: string; price_cad: number; status: string };
    fromCollectionId: string;
    unitPrice: number;
  }[] = [];

  for (const row of collectionSingleRows) {
    if (!row.card_id || !row.from_collection_id) continue;
    const card = cardMap.get(row.card_id);
    if (!card || card.status !== "reserved") {
      redirect("/checkout?error=unavailable");
    }

    const { data: collection } = await supabase
      .from("collections")
      .select("id, status")
      .eq("id", row.from_collection_id)
      .maybeSingle();

    if (!collection || collection.status !== "available") {
      redirect("/checkout?error=unavailable");
    }

    const { data: link } = await supabase
      .from("collection_cards")
      .select("card_id")
      .eq("collection_id", row.from_collection_id)
      .eq("card_id", row.card_id)
      .maybeSingle();

    if (!link) redirect("/checkout?error=unavailable");

    collectionSingleLineItems.push({
      cartItemId: row.id,
      card,
      fromCollectionId: row.from_collection_id,
      unitPrice: collectionSinglePriceCad(card.price_cad),
    });
  }

  const collectionLineItems: {
    cartItemId: string;
    collection: { id: string; title: string; price_cad: number; status: string };
    cardIds: string[];
  }[] = [];

  for (const row of collectionRowsOnly) {
    if (!row.collection_id) continue;
    const { data: collection } = await supabase
      .from("collections")
      .select("id, title, price_cad, status")
      .eq("id", row.collection_id)
      .maybeSingle();

    if (!collection || collection.status !== "available") {
      redirect("/checkout?error=unavailable");
    }

    const { data: links } = await supabase
      .from("collection_cards")
      .select("card_id")
      .eq("collection_id", collection.id);

    collectionLineItems.push({
      cartItemId: row.id,
      collection,
      cardIds: (links ?? []).map((link) => link.card_id),
    });
  }

  if (
    cardLineItems.length === 0 &&
    collectionLineItems.length === 0 &&
    collectionSingleLineItems.length === 0
  ) {
    redirect("/checkout?error=unavailable");
  }

  const subtotal =
    cardLineItems.reduce(
      (sum, item) => sum + Number(item.card.price_cad) * item.quantity,
      0,
    ) +
    collectionSingleLineItems.reduce((sum, item) => sum + item.unitPrice, 0) +
    collectionLineItems.reduce((sum, item) => sum + Number(item.collection.price_cad), 0);
  const total = subtotal + shippingFee;
  const { deposit_cad, balance_due_cad } = buildOrderPaymentAmounts(
    fulfillmentOptionRaw,
    total,
  );
  const orderNumber = generateOrderNumber();

  const pricingReviewRequested =
    fulfillmentOptionRaw === "canada_ship" &&
    formData.get("pricing_review_requested") === "1";
  const pricingReviewMessage = pricingReviewRequested
    ? normalizePricingReviewMessage(String(formData.get("pricing_review_message") ?? ""))
    : null;

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
      : fulfillmentOptionRaw === "next_day_pickup" && pickupArea
        ? { pickup_area: pickupArea }
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
      deposit_cad,
      balance_due_cad,
      shipping_address: shippingAddress,
      payment_method: orderPaymentMethodForFulfillment(fulfillmentOptionRaw),
      payment_status: "awaiting_transfer",
      fulfillment_status: "pending",
      pricing_review_message: pricingReviewMessage,
      pricing_review_requested_at: pricingReviewRequested
        ? new Date().toISOString()
        : null,
      pricing_review_resolved_at: null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    redirect("/checkout?error=order");
  }

  const orderItemRows = [
    ...cardLineItems.map((item) => ({
      order_id: order.id,
      card_id: item.card.id,
      collection_id: null,
      from_collection_id: null,
      title_snapshot: item.card.title,
      price_snapshot: item.card.price_cad,
      quantity: item.quantity,
    })),
    ...collectionSingleLineItems.map((item) => ({
      order_id: order.id,
      card_id: item.card.id,
      collection_id: null,
      from_collection_id: item.fromCollectionId,
      title_snapshot: `${item.card.title} (from collection)`,
      price_snapshot: item.unitPrice,
      quantity: 1,
    })),
    ...collectionLineItems.map((item) => ({
      order_id: order.id,
      card_id: null,
      collection_id: item.collection.id,
      from_collection_id: null,
      title_snapshot: `${item.collection.title} (collection)`,
      price_snapshot: item.collection.price_cad,
      quantity: 1,
    })),
  ];

  await supabase.from("order_items").insert(orderItemRows);

  const shopCardIdsToSell = cardLineItems.map((item) => item.card.id);
  const collectionSingleIdsToSell = collectionSingleLineItems.map((item) => item.card.id);
  const bundleCardIdsToSell = collectionLineItems.flatMap((item) => item.cardIds);

  const allCardIdsToSell = [
    ...shopCardIdsToSell,
    ...collectionSingleIdsToSell,
    ...bundleCardIdsToSell,
  ];

  if (allCardIdsToSell.length > 0) {
    await supabase.from("cards").update(markCardSoldUpdate()).in("id", allCardIdsToSell);
  }

  for (const item of collectionSingleLineItems) {
    await detachCardFromPublishedCollection(
      supabase,
      item.fromCollectionId,
      item.card.id,
    );
  }

  for (const item of collectionLineItems) {
    await supabase.from("collections").update({ status: "sold" }).eq("id", item.collection.id);
  }

  await supabase.from("cart_items").delete().eq("user_id", user.id);

  revalidateCartSurfaces();
  revalidatePath("/account/orders");
  revalidatePath("/admin/sales");
  revalidatePath("/admin/cards");
  revalidatePath("/admin/orders");
  revalidatePublicCatalogSeo();

  try {
    await sendOrderPlacedEmails(supabase, order.id);
  } catch (emailError) {
    console.error("[email] order placed send failed:", emailError);
  }

  redirect(`/account/orders/${orderNumber}`);
}
