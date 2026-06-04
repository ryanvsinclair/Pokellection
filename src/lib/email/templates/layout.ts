import { SITE_NAME } from "@/lib/utils";

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

export function wrapEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 20px;font-size:18px;font-weight:600;">${escapeHtml(SITE_NAME)}</p>
  ${bodyHtml}
  <p style="margin:32px 0 0;font-size:12px;color:#666;">${escapeHtml(SITE_NAME)} · Ottawa, ON</p>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<p style="margin:24px 0;"><a href="${safeHref}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${safeLabel}</a></p>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 12px;">${text}</p>`;
}
