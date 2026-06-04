import { getManagerNotificationEmail } from "@/lib/email/manager-email";
import { sendEmail } from "@/lib/email/send";
import { buildBuyerOrderConfirmationEmail } from "@/lib/email/templates/order-placed-buyer";
import { buildManagerOrderAlertEmail } from "@/lib/email/templates/order-placed-manager";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Sends buyer confirmation + manager alert after checkout.
 * Fail-open: logs errors; does not throw (order is already committed).
 */
export async function sendOrderPlacedEmails(
  supabase: Client,
  orderId: string,
): Promise<void> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("[email] order placed: order not found", orderId, orderError?.message);
    return;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const { data: settings } = await supabase
    .from("site_settings")
    .select("contact_email, etransfer_email, etransfer_instructions")
    .eq("id", 1)
    .maybeSingle();

  const orderItems = items ?? [];

  const buyerEmail = order.buyer_email?.trim();
  if (buyerEmail) {
    const buyer = buildBuyerOrderConfirmationEmail(order, orderItems, settings);
    const buyerResult = await sendEmail({
      to: buyerEmail,
      subject: buyer.subject,
      html: buyer.html,
      text: buyer.text,
      idempotency: {
        template: "order_placed_buyer",
        referenceType: "order",
        referenceId: orderId,
      },
    });
    if (!buyerResult.ok) {
      if ("skipped" in buyerResult && buyerResult.skipped) {
        console.warn("[email] buyer confirmation skipped:", buyerResult.reason);
      } else {
        console.error("[email] buyer confirmation failed:", buyerResult);
      }
    }
  }

  const managerEmail = getManagerNotificationEmail(settings);
  const manager = buildManagerOrderAlertEmail(order, orderItems);
  const managerResult = await sendEmail({
    to: managerEmail,
    subject: manager.subject,
    html: manager.html,
    text: manager.text,
    replyTo: order.buyer_email?.trim() || undefined,
    idempotency: {
      template: "order_placed_manager",
      referenceType: "order",
      referenceId: orderId,
    },
  });
  if (!managerResult.ok) {
    if ("skipped" in managerResult && managerResult.skipped) {
      console.warn("[email] manager alert skipped:", managerResult.reason);
    } else {
      console.error("[email] manager alert failed:", managerResult);
    }
  }
}
