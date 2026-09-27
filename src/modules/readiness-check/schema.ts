import { z } from "zod";

export const readinessCheckInput = z.object({
  myUrl: z.string().trim().min(1, "Enter your website.").max(300),
  competitorUrl: z.string().trim().min(1, "Enter a competitor's website.").max(300),
});

export type ReadinessCheckInput = z.infer<typeof readinessCheckInput>;

export type SiteResult = { domain: string; reached: boolean; score: number };

export type CheckRow = { label: string; detail: string; mine: boolean; them: boolean };

export type Finding = { level: "High impact" | "Worth doing" | "Keep it up"; title: string; detail: string };

/** Everything the result screen shows, and nothing else. */
export type ReadinessCheckResult = {
  mine: SiteResult;
  them: SiteResult;
  checks: CheckRow[];
  findings: Finding[];
};
