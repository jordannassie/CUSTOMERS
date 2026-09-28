import { z } from "zod";

export const EMAIL_JOBS = ["low_credits", "weekly_report"] as const;
export type EmailJob = (typeof EMAIL_JOBS)[number];

export const emailJobInput = z.object({ job: z.enum(EMAIL_JOBS) });
