import { Resend } from "resend";

let client: Resend | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendClient(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY!.trim());
  }
  return client;
}

export function getDefaultFromAddress(): string | null {
  const from = process.env.RESEND_DEFAULT_FROM?.trim();
  return from || null;
}
