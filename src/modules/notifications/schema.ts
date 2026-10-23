import { z } from "zod";

// account_purged: logo files and the last email after pg_cron purges deleted accounts (B-77, migration 042).
export const EMAIL_JOBS = ["low_credits", "weekly_report", "account_purged"] as const;
export type EmailJob = (typeof EMAIL_JOBS)[number];

export const emailJobInput = z.object({ job: z.enum(EMAIL_JOBS) });
