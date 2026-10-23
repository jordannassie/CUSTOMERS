// Pure rules for the Opportunities page (MVP_SPEC 8.1): statuses, order and the shape the screen needs.

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

export type OpportunityRow = {
  id: string;
  title: string;
  impact: string;
  status: string;
  description: string | null;
  evidence: string | null;
  recommended_action: string | null;
  claude_prompt: string | null;
  created_at: string;
  usesGoogle: boolean;
};

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
};

const IMPACT_ORDER: Record<Impact, number> = { high: 0, medium: 1, low: 2 };

const toImpact = (impact: string): Impact => (impact === "high" || impact === "low" ? impact : "medium");

const clean = (text: string | null) => (text?.trim() ? text.trim() : null);

/** Steps are stored as "1. Do this" lines; older rows hold one paragraph, which becomes one step. */
export function splitSteps(text: string | null): string[] {
  if (!text?.trim()) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean);
}

/** Most important first, then newest. */
export function toItems(rows: OpportunityRow[]): OpportunityItem[] {
  return [...rows]
    .sort(
      (a, b) =>
        IMPACT_ORDER[toImpact(a.impact)] - IMPACT_ORDER[toImpact(b.impact)] || b.created_at.localeCompare(a.created_at),
    )
    .map((row) => ({
      id: row.id,
      title: row.title,
      impact: toImpact(row.impact),
      status: fromDbStatus(row.status),
      evidence: clean(row.evidence),
      whyItMatters: clean(row.description),
      steps: splitSteps(row.recommended_action),
      claudePrompt: clean(row.claude_prompt),
      usesGoogle: row.usesGoogle,
    }));
}
