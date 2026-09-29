import "server-only";
import { findHandledEmailKeys, sendEmail, type SendEmailInput, type SendEmailResult, type WeeklyBusiness } from "@/modules/email";
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
import { hasSomethingToReport, lowCreditsKey, weeklyReportKey, type LowCreditAgency } from "./service";

// pg_cron asks for one job at a time (run_email_job, migration 038). Netlify ends a request after about 10
// seconds, so each run stops starting new agencies after TIME_BUDGET_MS; the next run picks up the rest, and
// the keys in email_log stop anyone getting the same email twice.
export const TIME_BUDGET_MS = 7_000;

export type JobSummary = { sent: number; skipped: number; failed: number; remaining: number };

export type JobDeps = {
  lowCreditAgencies: () => Promise<LowCreditAgency[]>;
  reportAgencies: () => Promise<ReportAgency[]>;
  businesses: (agencyId: string, now: Date) => Promise<WeeklyBusiness[]>;
  ownerEmail: (ownerUserId: string) => Promise<string | null>;
  ownerOf: (agencyId: string) => Promise<string | null>;
  handledKeys: (keys: string[]) => Promise<Set<string>>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
  now: () => Date;
};

type Task = { key: string; agencyId: string; ownerUserId: string | null };

async function runTasks(
  tasks: Task[],
  deps: JobDeps,
  build: (task: Task, to: string, now: Date) => Promise<SendEmailInput | null>,
): Promise<JobSummary> {
  const summary: JobSummary = { sent: 0, skipped: 0, failed: 0, remaining: 0 };
  const handled = await deps.handledKeys(tasks.map((t) => t.key));
  const started = deps.now().getTime();

  for (const task of tasks.filter((t) => !handled.has(t.key))) {
    if (deps.now().getTime() - started >= TIME_BUDGET_MS) {
      summary.remaining++;
      continue;
    }
    try {
      const owner = task.ownerUserId ?? (await deps.ownerOf(task.agencyId));
      const to = owner && (await deps.ownerEmail(owner));
      const input = to ? await build(task, to, deps.now()) : null;
      if (!input) {
        summary.skipped++;
        continue;
      }
      const result = await deps.send(input);
      summary[result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed"]++;
    } catch (error) {
      // One agency's bad data must not stop everyone else's email.
      console.error(`email job: agency ${task.agencyId}: ${error instanceof Error ? error.message : String(error)}`);
      summary.failed++;
    }
  }
  return summary;
}

/** The most serious level each agency is at now, once per level per credit period. */
export async function runLowCredits(deps: JobDeps): Promise<JobSummary> {
  const now = deps.now();
  const agencies = new Map((await deps.lowCreditAgencies()).map((a) => [lowCreditsKey(a, now), a]));
  const tasks = [...agencies].map(([key, a]) => ({ key, agencyId: a.agencyId, ownerUserId: null }));
  return runTasks(tasks, deps, async (task, to) => lowCreditsEmail({ to, agency: agencies.get(task.key)!, now }));
}

/** One summary per agency per week, only when at least one business has a score. */
export async function runWeeklyReport(deps: JobDeps): Promise<JobSummary> {
  const now = deps.now();
  const tasks = (await deps.reportAgencies()).map((a) => ({ key: weeklyReportKey(a.id, now), agencyId: a.id, ownerUserId: a.ownerUserId }));
  return runTasks(tasks, deps, async (task, to) => {
    const businesses = await deps.businesses(task.agencyId, now);
    return hasSomethingToReport(businesses) ? weeklyReportEmail({ to, agencyId: task.agencyId, businesses, now }) : null;
  });
}

export function liveJobDeps(overrides: Partial<JobDeps> = {}): JobDeps {
  return {
    lowCreditAgencies: () => listLowCreditAgencies(),
    reportAgencies: () => listWeeklyReportAgencies(),
    businesses: (agencyId, now) => weeklyBusinesses(agencyId, now),
    ownerEmail: (ownerUserId) => ownerEmail(ownerUserId),
    ownerOf: (agencyId) => ownerOf(agencyId),
    handledKeys: (keys) => findHandledEmailKeys(keys),
    send: (input) => sendEmail(input),
    now: () => new Date(),
    ...overrides,
  };
}

const JOBS: Record<EmailJob, (deps: JobDeps) => Promise<JobSummary>> = {
  low_credits: runLowCredits,
  weekly_report: runWeeklyReport,
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
