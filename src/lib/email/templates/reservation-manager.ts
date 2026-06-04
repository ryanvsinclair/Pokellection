import { getManagerNotificationEmail } from "@/lib/email/manager-email";
import type { Reservation } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailParagraph,
  escapeHtml,
  getSiteUrl,
  wrapEmailHtml,
} from "@/lib/email/templates/layout";

export function buildReservationManagerEmail(input: {
  reservation: Reservation;
  cardTitle: string;
  cardPriceCad: number;
  settings: { contact_email?: string | null } | null;
}): { subject: string; html: string; text: string; to: string } {
  const { reservation, cardTitle, cardPriceCad, settings } = input;
  const adminUrl = `${getSiteUrl()}/admin/reservations`;
  const expires = new Date(reservation.expires_at).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const bodyHtml = `
    ${emailParagraph(`<strong>New pickup reservation</strong> for ${escapeHtml(cardTitle)} (${escapeHtml(formatCad(cardPriceCad))}).`)}
    ${emailParagraph(`<strong>Buyer:</strong> ${escapeHtml(reservation.buyer_name)}<br>
      <a href="mailto:${escapeHtml(reservation.buyer_email)}">${escapeHtml(reservation.buyer_email)}</a><br>
      ${escapeHtml(reservation.buyer_phone)}`)}
    ${emailParagraph(`<strong>Expires:</strong> ${escapeHtml(expires)}`)}
    ${
      reservation.notes?.trim()
        ? emailParagraph(`<strong>Note:</strong> ${escapeHtml(reservation.notes.trim())}`)
        : ""
    }
    ${emailButton(adminUrl, "View reservations")}
  `;

  const text = [
    `New reservation: ${cardTitle} (${formatCad(cardPriceCad)})`,
    `Buyer: ${reservation.buyer_name} · ${reservation.buyer_email} · ${reservation.buyer_phone}`,
    `Expires: ${expires}`,
    reservation.notes?.trim() ? `Note: ${reservation.notes.trim()}` : null,
    adminUrl,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    to: getManagerNotificationEmail(settings),
    subject: `New reservation — ${cardTitle}`,
    html: wrapEmailHtml("New reservation", bodyHtml),
    text,
  };
}
