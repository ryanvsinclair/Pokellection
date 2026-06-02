export const SITE_NAME = "Pokellection";
export const SITE_DESCRIPTION =
  "Buy Pokemon cards in Ottawa — same-day local pickup or shipped anywhere in Canada via e-transfer.";
export const LOCATION = "Ottawa, Ontario";

export const BUSINESS_EMAIL = "hello@pokellection.com";
/** E.164 without plus — used for tel:/sms: links */
export const ORDER_SUPPORT_PHONE = "6139812555";
export const ORDER_SUPPORT_PHONE_DISPLAY = "(613) 981-2555";
export const ORDER_SUPPORT_SMS_INSTRUCTIONS =
  "Text must start with your order number, then your question.";

export function orderSupportSmsHref(orderNumber?: string): string {
  const body = orderNumber ? `${orderNumber} ` : "";
  return body ? `sms:${ORDER_SUPPORT_PHONE}?body=${encodeURIComponent(body)}` : `sms:${ORDER_SUPPORT_PHONE}`;
}

export function getEtransferEmail(
  settings?: { etransfer_email?: string | null } | null,
): string {
  const fromDb = settings?.etransfer_email?.trim();
  return fromDb || BUSINESS_EMAIL;
}

export function formatCad(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

const CONDITION_LABELS: Record<string, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getPhotoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/card-photos/${path}`;
}
