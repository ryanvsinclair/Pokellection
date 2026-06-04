import type { Reservation } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailCallout,
  emailKeyValue,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

export function buildReservationBuyerEmail(input: {
  reservation: Reservation;
  cardTitle: string;
  cardSlug: string;
  cardPriceCad: number;
}): { subject: string; html: string; text: string } {
  const { reservation, cardTitle, cardSlug, cardPriceCad } = input;
  const shopUrl = `${getSiteUrl()}/shop/${encodeURIComponent(cardSlug)}`;
  const expires = new Date(reservation.expires_at).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const notesRow = reservation.notes?.trim()
    ? [{ label: "Your note", valueHtml: escapeHtml(reservation.notes.trim()) }]
    : [];

  const bodyHtml = `
    ${emailCallout(
      "success",
      "Hold confirmed",
      `<p style="margin:0;"><strong>${escapeHtml(cardTitle)}</strong> · ${escapeHtml(formatCad(cardPriceCad))}</p>`,
    )}
    ${emailKeyValue([
      { label: "Expires", valueHtml: `${escapeHtml(expires)} <span style="color:#64748b;">(end of today, Ottawa)</span>` },
      ...notesRow,
    ])}
    <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#64748b;">Same-day pickup — coordinate payment and meetup by text or when you arrive.</p>
    ${emailButton(shopUrl, "View card")}
  `;

  const text = [
    `Hi ${reservation.buyer_name},`,
    `Pickup hold confirmed: ${cardTitle}`,
    `Expires: ${expires}`,
    reservation.notes?.trim() ? `Note: ${reservation.notes.trim()}` : null,
    `View card: ${shopUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Pickup hold confirmed — ${cardTitle}`,
    html: wrapEmailHtml("Reservation confirmed", bodyHtml, {
      preheader: `Hold for ${cardTitle} until ${expires}.`,
      headline: "Pickup hold confirmed",
      lead: `Hi ${escapeHtml(reservation.buyer_name)},`,
    }),
    text,
  };
}
