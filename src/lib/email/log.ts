import { createServiceClient } from "@/lib/supabase/service";

export type EmailReferenceType = "order" | "reservation";
export type EmailLogStatus = "sent" | "skipped" | "failed";

export type EmailIdempotency = {
  template: string;
  referenceType: EmailReferenceType;
  referenceId: string;
};

function serviceClientOrNull() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

/** True if this template already sent successfully for the reference (checkout double-submit guard). */
export async function emailAlreadySent(idempotency: EmailIdempotency): Promise<boolean> {
  const supabase = serviceClientOrNull();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("email_logs")
    .select("id")
    .eq("template", idempotency.template)
    .eq("reference_type", idempotency.referenceType)
    .eq("reference_id", idempotency.referenceId)
    .eq("status", "sent")
    .maybeSingle();

  if (error) {
    console.error("[email] idempotency check failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function logEmailAttempt(input: {
  template: string;
  recipient: string;
  referenceType: EmailReferenceType;
  referenceId: string;
  status: EmailLogStatus;
  providerId?: string;
  errorMessage?: string;
}): Promise<void> {
  const supabase = serviceClientOrNull();
  if (!supabase) return;

  const { error } = await supabase.from("email_logs").insert({
    template: input.template,
    recipient: input.recipient,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    status: input.status,
    provider_id: input.providerId ?? null,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    console.error("[email] log insert failed:", error.message);
  }
}
