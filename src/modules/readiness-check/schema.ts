import { z } from "zod";

const url = (missing: string) =>
  z.string(missing).trim().min(1, missing).max(300, "That web address is too long.");

export const readinessCheckInput = z.object(
  { myUrl: url("Enter your website."), competitorUrl: url("Enter a competitor's website.") },
  "Enter both websites.",
);

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
