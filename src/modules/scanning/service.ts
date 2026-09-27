import "server-only";
// Run a scan (B-26, MVP_SPEC 5.2, 4.2, D-53, D-54): hold the credits, run every question on every
// chosen model, charge 1 credit per successful check, then return the rest of the hold.
import { captureCredit, holdCredits, InsufficientCreditsError, isHoldOpen, releaseHold } from "@/modules/credits";
import { canRunScanJob, REASONS } from "@/modules/entitlements";
import { checkIdFor, runOneCheck, type CheckContext, type CheckTask } from "./check";
import type { ExtractNames } from "./extract";
import type { MentionTarget } from "./mentions";
import type { CheckLocation, ProviderId, RunCheck } from "./providers/types";
import { loadRecordedAnswers, recordedAnswers, RECORDED_ANSWERS_DIR } from "./recorded";
import {
  finishRun,
  findOrCreateRun,
  listSavedCheckIds,
  liveCheckRunner,
  liveNameExtractor,
  loadScanJob,
  loadScanTarget,
  setNextScanAt,
  type ScanTargetRow,
} from "./runs/dal";

// MVP_SPEC 5.2: 4 to 6 checks at a time per scan.
export const CHECKS_AT_ONCE = 5;

const DAY_MS = 24 * 60 * 60 * 1000;
const FREQUENCY_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
const PROVIDERS: ProviderId[] = ["openai", "anthropic", "perplexity"];

export type ScanDeps = {
  /** Live adapters by default; tests pass mocks. Null means the provider has no API key. */
  checkRunner: (provider: ProviderId) => RunCheck | null;
  extractNames: ExtractNames | null;
  recordedDir: string;
  now: () => Date;
};

export type ScanOutcome =
  | { status: "skipped"; reason: string }
  | {
      status: "done" | "failed";
      runId: string;
      checks: number;
      failed: number;
      charged: number;
      released: number;
      errors: string[];
    };

/**
 * Runs one claimed scan job to the end. "skipped" means nothing was held or charged (the reason is for the
 * job's error field); "failed" means every check failed, so nothing was charged. Throws only on database
 * errors; the hold stays open, so running the same job again resumes it without charging any check twice.
 */
export async function runScan(jobId: string, overrides: Partial<ScanDeps> = {}): Promise<ScanOutcome> {
  const job = await loadScanJob(jobId);
  const target = await loadScanTarget(job.businessId, job.agencyId);
  const blocker = scanBlocker(target);
  if (blocker) return { status: "skipped", reason: blocker };

  // A retried job already holds its credits; a started scan always finishes (D-54).
  if (!job.holdId) {
    const allowed = await canRunScanJob(job.agencyId, job.businessId);
    if (!allowed.allowed) return { status: "skipped", reason: allowed.reason };
  }

  const tasks = checkTasks(jobId, target);
  let holdId: string;
  try {
    holdId = await holdCredits(job.agencyId, tasks.length, jobId);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return { status: "skipped", reason: REASONS.outOfCredits };
    throw err;
  }
  if (!(await isHoldOpen(holdId))) return { status: "skipped", reason: "This scan already finished." };

  const models = target.business.models.filter(isProvider);
  const run = await findOrCreateRun({ jobId, businessId: job.businessId, provider: models.join(",") });
  const saved = await listSavedCheckIds(run.id);
  const ctx = await checkContext(target, run.id, overrides);

  let charged = 0;
  const errors: string[] = [];
  await forEachLimited(tasks, CHECKS_AT_ONCE, async (task) => {
    const outcome = saved.has(task.checkId) ? { ok: true as const } : await runOneCheck(task, ctx.forProvider(task.provider));
    if (!outcome.ok) {
      errors.push(outcome.error);
      return;
    }
    // Capture right after each check, so a scan cut off halfway has charged exactly what it saved.
    if (await captureCredit(holdId, task.checkId)) charged++;
  });

  const released = await releaseHold(holdId);
  const allFailed = errors.length === tasks.length;
  await finishRun(run.id, {
    status: allFailed ? "failed" : "completed",
    checksTotal: tasks.length,
    checksFailed: errors.length,
    error: errors.length > 0 ? summarise(errors) : null,
  });
  // A scan with no result keeps its due date, so the next scheduled run tries again.
  if (!allFailed) await setNextScanAt(job.businessId, nextScanAt(target.business.scanFrequency, ctx.now()));

  return {
    status: allFailed ? "failed" : "done",
    runId: run.id,
    checks: tasks.length,
    failed: errors.length,
    charged,
    released,
    errors,
  };
}

function scanBlocker({ business, questions }: ScanTargetRow): string | null {
  if (business.status === "paused") return "This business is paused.";
  if (!business.city) return "Add the business city before scanning.";
  if (questions.length === 0) return "This business has no active questions.";
  if (!business.models.some(isProvider)) return "Choose at least one AI model to check.";
  return null;
}

function checkTasks(jobId: string, { business, questions }: ScanTargetRow): CheckTask[] {
  const models = business.models.filter(isProvider);
  return questions.flatMap((q) =>
    models.map((provider) => ({
      checkId: checkIdFor(jobId, q.id, provider),
      promptId: q.id,
      provider,
      question: withCity(q.prompt, business.city!, business.region),
    })),
  );
}

async function checkContext(target: ScanTargetRow, runId: string, overrides: Partial<ScanDeps>) {
  const { business, competitors, isTest } = target;
  let checkRunner = overrides.checkRunner ?? liveCheckRunner;
  let extractNames = overrides.extractNames !== undefined ? overrides.extractNames : liveNameExtractor();
  if (isTest) {
    // Test agencies never reach a live model, whatever was passed in (D-61).
    const recorded = recordedAnswers(await loadRecordedAnswers(overrides.recordedDir ?? RECORDED_ANSWERS_DIR));
    checkRunner = recorded.runCheck;
    extractNames = recorded.extractNames;
  }

  const base: Omit<CheckContext, "runner"> = {
    runId,
    businessId: business.id,
    ownerUserId: business.ownerUserId,
    business: {
      name: business.name,
      aliases: business.aliases,
      website: business.domain,
      city: business.city,
      phone: business.phone,
      hasWebsite: business.hasWebsite ?? Boolean(business.domain),
    },
    competitors: competitors.map(
      (c): MentionTarget => ({ name: c.name, website: c.domain, phone: c.phone, city: c.city ?? business.city }),
    ),
    location: locationOf(business),
    isTest,
    extractNames,
  };
  const runners = new Map(PROVIDERS.map((p) => [p, checkRunner(p)]));
  return {
    now: overrides.now ?? (() => new Date()),
    forProvider: (provider: ProviderId): CheckContext => ({ ...base, runner: runners.get(provider) ?? null }),
  };
}

/** MVP_SPEC 5.2 step 1: every question names the business city. */
export function withCity(question: string, city: string, region: string | null): string {
  const text = question.trim();
  if (text.toLowerCase().includes(city.toLowerCase())) return text;
  const place = region ? `${city}, ${region}` : city;
  return `${text.replace(/[?.!\s]+$/, "")} in ${place}?`;
}

const COUNTRY_CODES: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  "u s": "US",
  "u s a": "US",
  canada: "CA",
  "united kingdom": "GB",
  uk: "GB",
  australia: "AU",
};

/** The providers want an ISO country code; businesses store whatever onboarding saved. */
export function countryCode(country: string | null): string {
  const text = (country ?? "").trim();
  if (/^[a-z]{2}$/i.test(text)) return text.toUpperCase();
  const key = text.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  return COUNTRY_CODES[key] ?? "US";
}

function locationOf(business: ScanTargetRow["business"]): CheckLocation {
  return { city: business.city ?? "", region: business.region ?? "", country: countryCode(business.country) };
}

export function nextScanAt(frequency: string, from: Date): Date {
  return new Date(from.getTime() + (FREQUENCY_DAYS[frequency] ?? 7) * DAY_MS);
}

function isProvider(model: string): model is ProviderId {
  return (PROVIDERS as string[]).includes(model);
}

function summarise(errors: string[]): string {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts]
    .map(([e, n]) => (n > 1 ? `${e} (${n} checks)` : e))
    .join("; ")
    .slice(0, 1000);
}

async function forEachLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
