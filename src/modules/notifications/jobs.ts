import "server-only";
import { runPurgeFollowUp } from "@/modules/account";
import { runPriceMoves } from "@/modules/billing";
import { findEmailKeyStates, recordUnsentEmail, sendEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";
import {
  isEmailJobSecret,
  listLowCreditAgencies,
  listWeeklyReportAgencies,
  ownerEmail,
  ownerOf,
  weeklyBusinesses,
  type ReportAgency,
} from "./dal";
import { lowCreditsEmail, weeklyReportEmail } from "./emails";
import { emailJobInput, type EmailJob } from "./schema";
import { hasSomethingToReport, lowCreditsKey, OutOfTime, weeklyReportKey, type LowCreditAgency, type ReportedBusiness } from "./service";

// pg_cron asks for one job at a time (run_email_job, migration 038). Netlify ends a request after about 10
// seconds, so each run stops starting new agencies after TIME_BUDGET_MS, and stops work inside an agency (between
// businesses) at AGENCY_STOP_MS; the next run picks up the rest, and the keys in email_log stop anyone getting the
// same email twice.
export const TIME_BUDGET_MS = 7_000;
export const AGENCY_STOP_MS = 8_000;

export type JobSummary = { sent: number; skipped: number; failed: number; remaining: number };

type UnsentEmail = Parameters<typeof recordUnsentEmail>[0];

export type JobDeps = {
  lowCreditAgencies: () => Promise<LowCreditAgency[]>;
  reportAgencies: () => Promise<ReportAgency[]>;
  /** Throws OutOfTime once `outOfTime` says so, between businesses. */
  businesses: (agencyId: string, now: Date, outOfTime: () => boolean) => Promise<ReportedBusiness[]>;
  ownerEmail: (ownerUserId: string) => Promise<string | null>;
  ownerOf: (agencyId: string) => Promise<string | null>;
  /** handled: sent or skipped already. tried: failed last time, so it goes last. */
  keyStates: (keys: string[]) => Promise<{ handled: Set<string>; tried: Set<string> }>;
  recordUnsent: (row: UnsentEmail) => Promise<void>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
  now: () => Date;
};

type Task = { key: string; type: UnsentEmail["type"]; agencyId: string; ownerUserId: string | null };
type Build = (task: Task, to: string, now: Date, outOfTime: () => boolean) => Promise<SendEmailInput | null>;

async function runTasks(tasks: Task[], deps: JobDeps, build: Build): Promise<JobSummary> {
  const summary: JobSummary = { sent: 0, skipped: 0, failed: 0, remaining: 0 };
  const { handled, tried } = await deps.keyStates(tasks.map((t) => t.key));
  const started = deps.now().getTime();
  const elapsed = () => deps.now().getTime() - started;
  const outOfTime = () => elapsed() >= AGENCY_STOP_MS;
  const unsent = (task: Task, to: string, status: UnsentEmail["status"], reason: string) =>
    deps.recordUnsent({ type: task.type, agencyId: task.agencyId, to, idempotencyKey: task.key, status, reason }).catch((error) => {
      console.error(`email job: agency ${task.agencyId}: could not log the ${status} email: ${errorText(error)}`);
    });
  // An agency that failed or ran out of time on an earlier run goes last, so it never holds up everyone else.
  const pending = tasks.filter((t) => !handled.has(t.key));
  const ordered = [...pending.filter((t) => !tried.has(t.key)), ...pending.filter((t) => tried.has(t.key))];

  for (const task of ordered) {
    if (elapsed() >= TIME_BUDGET_MS) {
      summary.remaining++;
      continue;
    }
    let to: string | null = null;
    try {
      const owner = task.ownerUserId ?? (await deps.ownerOf(task.agencyId));
      to = owner ? await deps.ownerEmail(owner) : null;
      if (!to) {
        summary.skipped++;
        continue;
      }
      const input = await build(task, to, deps.now(), outOfTime);
      if (!input) {
        // Nothing to report: logged under the key, so the later runs this week pass over the agency at once.
        await unsent(task, to, "skipped", "nothing to report");
        summary.skipped++;
        continue;
      }
      const result = await deps.send(input);
      summary[result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed"]++;
    } catch (error) {
      if (error instanceof OutOfTime) {
        summary.remaining++;
        if (to) await unsent(task, to, "failed", "out of time");
        continue;
      }
      // One agency's bad data must not stop everyone else's email.
      console.error(`email job: agency ${task.agencyId}: ${errorText(error)}`);
      summary.failed++;
      if (to) await unsent(task, to, "failed", errorText(error));
    }
  }
  return summary;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The most serious level each agency is at now, once per level per credit period. */
export async function runLowCredits(deps: JobDeps): Promise<JobSummary> {
  const now = deps.now();
  const agencies = new Map((await deps.lowCreditAgencies()).map((a) => [lowCreditsKey(a, now), a]));
  const tasks = [...agencies].map(([key, a]) => ({ key, type: "low_credits" as const, agencyId: a.agencyId, ownerUserId: null }));
  return runTasks(tasks, deps, async (task, to) => lowCreditsEmail({ to, agency: agencies.get(task.key)!, now }));
}

/** One summary per agency per week, only when at least one business has a score. */
export async function runWeeklyReport(deps: JobDeps): Promise<JobSummary> {
  const now = deps.now();
  const tasks = (await deps.reportAgencies()).map((a) => ({
    key: weeklyReportKey(a.id, now),
    type: "weekly_report" as const,
    agencyId: a.id,
    ownerUserId: a.ownerUserId,
  }));
  return runTasks(tasks, deps, async (task, to, _now, outOfTime) => {
    const businesses = await deps.businesses(task.agencyId, now, outOfTime);
    return hasSomethingToReport(businesses) ? weeklyReportEmail({ to, agencyId: task.agencyId, businesses, now }) : null;
  });
}

export function liveJobDeps(overrides: Partial<JobDeps> = {}): JobDeps {
  return {
    lowCreditAgencies: () => listLowCreditAgencies(),
    reportAgencies: () => listWeeklyReportAgencies(),
    businesses: (agencyId, now, outOfTime) => weeklyBusinesses(agencyId, now, outOfTime),
    ownerEmail: (ownerUserId) => ownerEmail(ownerUserId),
    ownerOf: (agencyId) => ownerOf(agencyId),
    keyStates: (keys) => findEmailKeyStates(keys),
    recordUnsent: (row) => recordUnsentEmail(row),
    send: (input) => sendEmail(input),
    now: () => new Date(),
    ...overrides,
  };
}

const JOBS: Record<EmailJob, (deps: JobDeps) => Promise<JobSummary>> = {
  low_credits: runLowCredits,
  weekly_report: runWeeklyReport,
  account_purged: () => runPurgeFollowUp(),
  price_changes: () => runPriceMoves(),
};

/** The route behind run_email_job. The worker secret header is the auth; there is no signed-in user. */
export async function handleEmailJobRequest(req: Request, deps?: JobDeps): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!isEmailJobSecret(req.headers.get("x-worker-secret"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = emailJobInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown email job." }, { status: 400 });
  const summary = await JOBS[parsed.data.job](deps ?? liveJobDeps());
  return Response.json({ job: parsed.data.job, ...summary });
}
