import { getManagerNotificationEmail } from "@/lib/email/manager-email";
import type { Reservation } from "@/types/database";
import { formatCad } from "@/lib/utils";
import {
  emailButton,
  emailCallout,
  emailKeyValue,
  emailMailto,
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

  const notesRow = reservation.notes?.trim()
    ? [{ label: "Note", valueHtml: escapeHtml(reservation.notes.trim()) }]
    : [];

  const bodyHtml = `
    ${emailCallout(
      "info",
      "New pickup reservation",
      `<p style="margin:0;"><strong>${escapeHtml(cardTitle)}</strong> · ${escapeHtml(formatCad(cardPriceCad))}</p>`,
    )}
    ${emailKeyValue([
      {
        label: "Buyer",
        valueHtml: `${escapeHtml(reservation.buyer_name)}<br>${emailMailto(reservation.buyer_email)}<br>${escapeHtml(reservation.buyer_phone)}`,
      },
      { label: "Expires", valueHtml: escapeHtml(expires) },
      ...notesRow,
    ])}
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
    html: wrapEmailHtml("New reservation", bodyHtml, {
      preheader: `${reservation.buyer_name} reserved ${cardTitle}.`,
      headline: "New reservation",
      lead: "A buyer placed a same-day pickup hold.",
    }),
    text,
  };
}
