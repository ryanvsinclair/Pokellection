import type { Reservation } from "@/types/database";
import {
  emailButton,
  emailParagraph,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

export function buildReservationBuyerEmail(input: {
  reservation: Reservation;
  cardTitle: string;
  cardSlug: string;
}): { subject: string; html: string; text: string } {
  const { reservation, cardTitle, cardSlug } = input;
  const shopUrl = `${getSiteUrl()}/shop/${encodeURIComponent(cardSlug)}`;
  const expires = new Date(reservation.expires_at).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const notesBlock = reservation.notes?.trim()
    ? emailParagraph(`<strong>Your note:</strong> ${escapeHtml(reservation.notes.trim())}`)
    : "";

  const bodyHtml = `
    ${emailParagraph(`Hi ${escapeHtml(reservation.buyer_name)},`)}
    ${emailParagraph(`Your pickup hold for <strong>${escapeHtml(cardTitle)}</strong> is confirmed.`)}
    ${emailParagraph(`<strong>Hold expires:</strong> ${escapeHtml(expires)} (end of today, Ottawa time)`)}
    ${emailParagraph("Same-day pickup — coordinate payment and meetup by text or when you arrive.")}
    ${notesBlock}
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
    html: wrapEmailHtml("Reservation confirmed", bodyHtml),
    text,
  };
}
