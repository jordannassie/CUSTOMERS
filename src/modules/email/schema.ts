import { z } from "zod";

// The five MVP emails (D-37), the admin alert (B-69), the deletion emails (B-77) and the price change notice (D-93).
// Matches the check on email_log.type (migration 083).
export const EMAIL_TYPES = [
  "welcome",
  "trial_ending",
  "payment_failed",
  "low_credits",
  "weekly_report",
  "system_alert",
  "business_deleted",
  "account_deleted",
  "account_restored",
  "account_purged",
  // A plan price change reaching an existing customer at the next renewal (D-93, migration 083).
  "price_change",
] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

// Emails a user can turn off. Only the weekly report needs an unsubscribe link by law (MVP_SPEC 10).
export const UNSUBSCRIBE_TOPICS = ["weekly_report"] as const;
export type UnsubscribeTopic = (typeof UNSUBSCRIBE_TOPICS)[number];

export const unsubscribeTokenInput = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9._-]+$/);

export const emailPreferencesInput = z.object({ weeklyReport: z.boolean() });
export type EmailPreferences = z.infer<typeof emailPreferencesInput>;
