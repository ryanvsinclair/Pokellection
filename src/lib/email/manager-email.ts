import { BUSINESS_EMAIL } from "@/lib/utils";

export type ManagerEmailSettings = {
  contact_email?: string | null;
};

/** Manager inbox for order alerts: env → site_settings → business default. */
export function getManagerNotificationEmail(
  settings?: ManagerEmailSettings | null,
): string {
  const fromEnv = process.env.MANAGER_NOTIFICATION_EMAIL?.trim();
  if (fromEnv) return fromEnv;

  const fromDb = settings?.contact_email?.trim();
  if (fromDb) return fromDb;

  return BUSINESS_EMAIL;
}
