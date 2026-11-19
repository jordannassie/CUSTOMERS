import { z } from "zod";

// account_purged: logo files and the last email after pg_cron purges deleted accounts (B-77, migration 042).
// price_changes: existing customers moved to new plan prices at their next renewal, with an email (D-93, migration 083).
export const EMAIL_JOBS = ["low_credits", "weekly_report", "account_purged", "price_changes"] as const;
export type EmailJob = (typeof EMAIL_JOBS)[number];

export const emailJobInput = z.object({ job: z.enum(EMAIL_JOBS) });
