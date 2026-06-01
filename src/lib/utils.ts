export const SITE_NAME = "Pokellection";
export const SITE_DESCRIPTION =
  "Buy Pokemon cards in Ottawa — same-day local pickup or shipped anywhere in Canada via e-transfer.";
export const LOCATION = "Ottawa, Ontario";

export function formatCad(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
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
