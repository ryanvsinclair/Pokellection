export function getTrackingUrl(trackingNumber: string): string {
  const encoded = encodeURIComponent(trackingNumber.trim());
  return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${encoded}`;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PKL-${y}${m}${d}-${suffix}`;
}
