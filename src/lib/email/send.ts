import { getDefaultFromAddress, getResendClient, isEmailConfigured } from "@/lib/email/resend-client";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | undefined }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not set" };
  }

  const from = getDefaultFromAddress();
  if (!from) {
    return { ok: false, skipped: true, reason: "RESEND_DEFAULT_FROM not set" };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const recipients = to.map((address) => address.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { ok: false, skipped: true, reason: "No recipients" };
  }

  const resend = getResendClient();
  if (!resend) {
    return { ok: false, skipped: true, reason: "Resend client unavailable" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}
