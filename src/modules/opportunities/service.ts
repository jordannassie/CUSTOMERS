// Pure rules for fixes (MVP_SPEC 8.1): the old three statuses, the steps, and the card shape OpportunityCard shows.
import type { Where } from "./where";

export const STATUSES = ["open", "done", "dismissed"] as const;
export type Status = (typeof STATUSES)[number];
export type Impact = "high" | "medium" | "low";

// The table keeps its legacy values: "resolved" is done, and "in_progress" still counts as to do.
const TO_DB: Record<Status, string> = { open: "open", done: "resolved", dismissed: "dismissed" };

export function toDbStatus(status: Status): string {
  return TO_DB[status];
}

export function fromDbStatus(status: string): Status {
  if (status === "resolved") return "done";
  if (status === "dismissed") return "dismissed";
  return "open";
}

export type OpportunityItem = {
  id: string;
  title: string;
  impact: Impact;
  status: Status;
  evidence: string | null;
  whyItMatters: string | null;
  steps: string[];
  claudePrompt: string | null;
  usesGoogle: boolean;
  /** Where the owner makes this fix (where.ts). */
  where: Where;
  /** Tracked competitors the fix is about, to link each to its comparison page. */
  about: { id: string; name: string }[];
};

/** Steps are stored as "1. Do this" lines; older rows hold one paragraph, which becomes one step. */
export function splitSteps(text: string | null): string[] {
  if (!text?.trim()) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean);
}
