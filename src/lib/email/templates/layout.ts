import { SITE_NAME } from "@/lib/utils";

/** Matches storefront light theme (globals.css) — inline for email clients. */
const C = {
  background: "#f1f5f9",
  card: "#ffffff",
  foreground: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  primary: "#dc2626",
  primaryDark: "#b91c1c",
  accent: "#facc15",
  link: "#b91c1c",
} as const;

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return url || "http://localhost:3000";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailWrapOptions = {
  /** Inbox preview (hidden in body) */
  preheader?: string;
  /** Large title inside the card */
  headline?: string;
  /** Muted subtitle under headline */
  lead?: string;
};

export function wrapEmailHtml(
  title: string,
  bodyHtml: string,
  options?: EmailWrapOptions,
): string {
  const siteUrl = getSiteUrl();
  const preheader = options?.preheader?.trim();
  const headline = options?.headline?.trim();
  const lead = options?.lead?.trim();

  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;</div>`
    : "";

  const heroBlock =
    headline || lead
      ? `<tr>
          <td style="padding:28px 32px 0;">
            ${headline ? emailHeadline(headline) : ""}
            ${lead ? emailLead(lead) : ""}
          </td>
        </tr>`
      : "";

  const bodyPaddingTop = headline || lead ? "8px" : "28px";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheaderBlock}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
          <tr>
            <td style="padding:0 0 16px;">
              <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;display:inline-block;">
                <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${C.foreground};">${escapeHtml(SITE_NAME)}</span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${C.primary} 0%,${C.primaryDark} 55%,${C.accent} 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                ${heroBlock}
                <tr>
                  <td style="padding:${bodyPaddingTop} 32px 28px;font-size:15px;line-height:1.6;color:${C.foreground};">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.5;color:${C.muted};">
              <p style="margin:0 0 6px;">${escapeHtml(SITE_NAME)} · Ottawa, ON</p>
              <p style="margin:0;">
                <a href="${escapeHtml(siteUrl)}" style="color:${C.muted};text-decoration:underline;">Visit the shop</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeadline(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3;color:${C.foreground};">${text}</h1>`;
}

export function emailLead(text: string): string {
  return `<p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:${C.muted};">${text}</p>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.foreground};">${text}</p>`;
}

export function emailOrderBadge(orderNumber: string): string {
  return `<span style="display:inline-block;padding:4px 10px;background-color:${C.background};border:1px solid ${C.border};border-radius:6px;font-size:13px;font-weight:600;font-family:ui-monospace,monospace;color:${C.foreground};">${escapeHtml(orderNumber)}</span>`;
}

export type CalloutVariant = "info" | "warning" | "success" | "payment";

const CALLOUT: Record<
  CalloutVariant,
  { bg: string; border: string; titleColor: string }
> = {
  info: { bg: "#eff6ff", border: "#93c5fd", titleColor: "#1d4ed8" },
  warning: { bg: "#fffbeb", border: "#fcd34d", titleColor: "#b45309" },
  success: { bg: "#ecfdf5", border: "#6ee7b7", titleColor: "#047857" },
  payment: { bg: "#fef2f2", border: "#fca5a5", titleColor: C.primaryDark },
};

export function emailCallout(
  variant: CalloutVariant,
  title: string,
  contentHtml: string,
): string {
  const s = CALLOUT[variant];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
    <tr>
      <td style="padding:16px 18px;background-color:${s.bg};border:1px solid ${s.border};border-radius:10px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${s.titleColor};">${escapeHtml(title)}</p>
        <div style="font-size:14px;line-height:1.55;color:${C.foreground};">${contentHtml}</div>
      </td>
    </tr>
  </table>`;
}

export function emailKeyValue(rows: { label: string; valueHtml: string }[]): string {
  const trs = rows
    .map(
      (row) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:13px;font-weight:600;color:${C.muted};width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.foreground};vertical-align:top;">${row.valueHtml}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">${trs}</table>`;
}

export function emailItemsTable(
  rows: { title: string; quantity: number; lineTotal: string }[],
): string {
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>
          <td style="padding:12px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.foreground};">${escapeHtml(row.title)} <span style="color:${C.muted};">× ${row.quantity}</span></td>
          <td style="padding:12px 0;border-bottom:1px solid ${C.border};font-size:14px;font-weight:600;text-align:right;color:${C.foreground};white-space:nowrap;">${escapeHtml(row.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="padding:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${C.muted};text-align:left;border-bottom:2px solid ${C.border};">Item</th>
        <th style="padding:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${C.muted};text-align:right;border-bottom:2px solid ${C.border};">Amount</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

export function emailTotals(
  lines: { label: string; value: string; emphasize?: boolean }[],
): string {
  const trs = lines
    .map((line) => {
      const isTotal = line.emphasize;
      return `<tr>
        <td style="padding:${isTotal ? "10px" : "6px"} 0;font-size:${isTotal ? "15px" : "14px"};font-weight:${isTotal ? "700" : "400"};color:${isTotal ? C.foreground : C.muted};">${escapeHtml(line.label)}</td>
        <td style="padding:${isTotal ? "10px" : "6px"} 0;font-size:${isTotal ? "18px" : "14px"};font-weight:${isTotal ? "700" : "600"};text-align:right;color:${isTotal ? C.primaryDark : C.foreground};">${escapeHtml(line.value)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">${trs}</table>`;
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;">
    <tr>
      <td style="border-radius:8px;background-color:${C.primary};">
        <a href="${safeHref}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${safeLabel}</a>
      </td>
    </tr>
  </table>`;
}

export function emailSecondaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;">
    <tr>
      <td style="border-radius:8px;border:1px solid ${C.border};background-color:${C.card};">
        <a href="${safeHref}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:${C.foreground};text-decoration:none;border-radius:8px;">${safeLabel}</a>
      </td>
    </tr>
  </table>`;
}

export function emailButtonGroup(buttons: { href: string; label: string; primary?: boolean }[]): string {
  return buttons
    .map((b) => (b.primary !== false ? emailButton(b.href, b.label) : emailSecondaryButton(b.href, b.label)))
    .join("");
}

/** Styled mailto link */
export function emailMailto(email: string): string {
  const safe = escapeHtml(email);
  return `<a href="mailto:${safe}" style="color:${C.link};font-weight:600;text-decoration:underline;">${safe}</a>`;
}
