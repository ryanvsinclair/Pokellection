import {
  emailAlreadySent,
  logEmailAttempt,
  type EmailIdempotency,
} from "@/lib/email/log";
import { getDefaultFromAddress, getResendClient, isEmailConfigured } from "@/lib/email/resend-client";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** When set, skips duplicate sends (same template + reference) and writes email_logs. */
  idempotency?: EmailIdempotency;
};

export type SendEmailResult =
  | { ok: true; id: string | undefined }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

async function persistEmailLog(
  input: SendEmailInput,
  recipient: string,
  result: SendEmailResult,
): Promise<void> {
  if (!input.idempotency) return;

  const status =
    result.ok === true
      ? "sent"
      : "skipped" in result && result.skipped
        ? "skipped"
        : "failed";

  await logEmailAttempt({
    template: input.idempotency.template,
    recipient,
    referenceType: input.idempotency.referenceType,
    referenceId: input.idempotency.referenceId,
    status,
    providerId: result.ok ? result.id : undefined,
    errorMessage:
      result.ok === false
        ? "skipped" in result && result.skipped
          ? result.reason
          : "error" in result
            ? result.error
            : undefined
        : undefined,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const recipients = to.map((address) => address.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { ok: false, skipped: true, reason: "No recipients" };
  }

  const primaryRecipient = recipients[0];

  if (input.idempotency && (await emailAlreadySent(input.idempotency))) {
    return { ok: true, id: undefined };
  }

  if (!isEmailConfigured()) {
    const result = { ok: false, skipped: true, reason: "RESEND_API_KEY not set" } as const;
    await persistEmailLog(input, primaryRecipient, result);
    return result;
  }

  const from = getDefaultFromAddress();
  if (!from) {
    const result = { ok: false, skipped: true, reason: "RESEND_DEFAULT_FROM not set" } as const;
    await persistEmailLog(input, primaryRecipient, result);
    return result;
  }

  const resend = getResendClient();
  if (!resend) {
    const result = { ok: false, skipped: true, reason: "Resend client unavailable" } as const;
    await persistEmailLog(input, primaryRecipient, result);
    return result;
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
      const result = { ok: false, error: error.message } as const;
      await persistEmailLog(input, primaryRecipient, result);
      return result;
    }

    const result = { ok: true as const, id: data?.id };
    await persistEmailLog(input, primaryRecipient, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    console.error("[email] send failed:", message);
    const result = { ok: false, error: message } as const;
    await persistEmailLog(input, primaryRecipient, result);
    return result;
  }
}
