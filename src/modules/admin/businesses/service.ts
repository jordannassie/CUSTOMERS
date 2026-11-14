// Pure rules for the admin Businesses pages (B-66, MVP_SPEC 9.1).

// Above the default 0 the schedule uses, so a support rescan is claimed before routine jobs (MVP_SPEC 6.4).
// One above the app's Run scan (100): the job row has no source column, so the value is what marks an admin scan.
export const ADMIN_SCAN_PRIORITY = 101;

export type ScanState = "queued" | "running" | "done" | "failed" | "skipped";

// Jobs (scan_jobs) and older runs without a job (visibility_runs) use different words for the same states.
const STATE_OF: Record<string, ScanState> = {
  queued: "queued",
  pending: "queued",
  running: "running",
  done: "done",
  completed: "done",
  failed: "failed",
  skipped: "skipped",
};

export function toScanState(status: string): ScanState {
  return STATE_OF[status] ?? "failed";
}

export function isActive(state: ScanState): boolean {
  return state === "queued" || state === "running";
}

export function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Credits per key, from capture rows that each cost `credits`. Rows with no key are skipped. */
export function sumBy<T>(rows: T[], key: (row: T) => string | null | undefined, credits: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k) totals.set(k, (totals.get(k) ?? 0) + credits(row));
  }
  return totals;
}

/** Newest row per key, from rows already sorted newest first. */
export function firstBy<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const first = new Map<string, T>();
  for (const row of rows) if (!first.has(key(row))) first.set(key(row), row);
  return first;
}

/** The AI models a scan can ask, in the order every admin table shows them. */
export const SCAN_MODELS = ["openai", "anthropic", "perplexity"] as const;

const isScanModel = (m: string) => (SCAN_MODELS as readonly string[]).includes(m);

/**
 * The models a run set out to ask, from visibility_runs.provider ("openai,anthropic,perplexity", written by the worker).
 * Runs from before the job queue say "scan" or "multi", so they give none and the saved answers say what was asked.
 */
export function runModels(provider: string | null | undefined): string[] {
  return (provider ?? "").split(",").map((m) => m.trim()).filter(isScanModel);
}

/** Failed checks per model, from visibility_runs.failed_by_provider ({"perplexity": {"failed": 10, "reason": "..."}}). */
export function runFailures(value: unknown): Record<string, { failed: number; reason: string | null }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, { failed: number; reason: string | null }> = {};
  for (const [model, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isScanModel(model) || !entry || typeof entry !== "object") continue;
    const { failed, reason } = entry as { failed?: unknown; reason?: unknown };
    out[model] = { failed: typeof failed === "number" ? failed : 0, reason: typeof reason === "string" ? reason : null };
  }
  return out;
}

export type ScanReadiness = {
  deleted: boolean;
  agency: { name: string; status: string } | null;
  status: string;
  city: string | null;
  activeQuestions: number;
  models: string[];
  /** The agency's spendable credits (open holds already taken off), null without an agency. */
  balance: number | null;
  /** The newest scan, for its failure or skip reason. */
  lastScan: { state: ScanState; error: string | null } | null;
};

export type RunScanCheck = {
  /** Why a scan cannot run, or null. The button is off and shows this. */
  blocked: string | null;
  /** Things to know before running it, shown in the dialog. */
  warnings: string[];
  /** Credits a full scan holds: each active question on each model (D-54). */
  credits: number;
};

const count = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/**
 * Whether the admin "Run scan now" can do anything useful (admin audit 2026-11-12). The worker skips a paused
 * business, one with no city, questions or models, and one whose agency has no credits, so those are said up front.
 * `explain` turns a stored scan error into plain words.
 */
export function runScanCheck(f: ScanReadiness, explain: (error: string) => string | null): RunScanCheck {
  const models = f.models.filter(isScanModel);
  const credits = f.activeQuestions * models.length;
  const blocked = scanBlocker(f, models.length);
  if (blocked) return { blocked, warnings: [], credits };

  const warnings: string[] = [];
  const agency = f.agency?.name || "The agency";
  if (f.balance !== null && f.balance <= 0) {
    warnings.push(
      `${agency} has ${count(f.balance, "credit", "credits")} and this scan needs about ${count(credits, "credit", "credits")}. With no credits the scan is skipped and nothing is charged. Add credits first.`,
    );
  } else if (f.balance !== null && f.balance < credits) {
    warnings.push(
      `${agency} has ${count(f.balance, "credit", "credits")} and this scan needs about ${count(credits, "credit", "credits")}. It still runs, and the balance goes below zero.`,
    );
  }
  const last = f.lastScan;
  if (last && (last.state === "failed" || last.state === "skipped") && last.error) {
    const reason = explain(last.error);
    if (reason) warnings.push(`The last scan ${last.state === "failed" ? "failed" : "was skipped"}: ${reason}`);
  }
  return { blocked: null, warnings, credits };
}

function scanBlocker(f: ScanReadiness, models: number): string | null {
  if (f.deleted) return "This business was deleted, so it can't be scanned.";
  if (!f.agency) return "No agency, so there are no credits to scan with.";
  if (f.agency.status === "deleted") return "This account was deleted. Restore it before running a scan.";
  if (f.status === "onboarding") return "This business is still being set up, so it has no plan or questions to scan yet.";
  if (f.status === "paused") return "This business is paused, so a scan would be skipped.";
  if (f.activeQuestions === 0) return "This business has no active questions, so a scan has nothing to ask.";
  if (models === 0) return "No AI models are picked for this business, so a scan has nothing to ask.";
  if (!f.city) return "This business has no city, so a scan would be skipped.";
  return null;
}
