"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateOrderNumber } from "@/lib/tracking";
import { createClient } from "@/lib/supabase/server";

export async function addToCart(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTo = String(formData.get("redirect") ?? "/checkout");
    redirect(`/account/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart_items").insert({
      user_id: user.id,
      card_id: cardId,
      quantity: 1,
    });
  }

  revalidatePath("/checkout");
  revalidatePath("/shop");
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

  await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId)
    .eq("user_id", user.id);

  revalidatePath("/checkout");
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
  revalidatePath("/checkout");
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

  const shippingMethod = String(formData.get("shipping_method") ?? "untracked") as
    | "untracked"
    | "tracked";
  const buyerName = String(formData.get("buyer_name") ?? profile?.display_name ?? "");
  const buyerPhone = String(formData.get("buyer_phone") ?? profile?.phone ?? "");
  const street = String(formData.get("street") ?? "");
  const city = String(formData.get("city") ?? "");
  const province = String(formData.get("province") ?? "ON");
  const postalCode = String(formData.get("postal_code") ?? "");

  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  const shippingFee =
    shippingMethod === "tracked"
      ? Number(settings?.tracked_shipping_fee_cad ?? 15)
      : Number(settings?.untracked_shipping_fee_cad ?? 3);

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

  const lineItems = cartRows
    .map((row) => {
      const card = cardMap.get(row.card_id);
      if (!card || card.status !== "available") return null;
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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      buyer_id: user.id,
      buyer_email: user.email ?? "",
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      fulfillment_type: "ship",
      shipping_method: shippingMethod,
      shipping_fee_cad: shippingFee,
      subtotal_cad: subtotal,
      total_cad: total,
      shipping_address: { street, city, province, postal_code: postalCode },
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

  revalidatePath("/checkout");
  revalidatePath("/shop");
  revalidatePath("/account/orders");

  redirect(`/account/orders/${orderNumber}`);
}
