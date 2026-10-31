import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { currentReport, shareForEmail } from "@/modules/reports";
import type { Database } from "@/types/database.types";
import { OutOfTime, weeklyBusiness, type LowCreditAgency, type ReportedBusiness } from "./service";

// The scheduled emails run from pg_cron with no signed-in user, so every read here uses the service role,
// after the route has checked the worker secret.
type Db = SupabaseClient<Database>;

export function isEmailJobSecret(header: string | null): boolean {
  const secret = env.WORKER_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function ownerEmail(ownerUserId: string, db: Db = createServiceClient()): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(ownerUserId);
  if (error) throw new Error(`Owner lookup failed: ${error.message}`);
  return data.user?.email ?? null;
}

const LEVELS = new Set(["low", "empty", "negative"]);

// The generated types say string, but a left join and an agency without plan credits give null.
const dateOrNull = (value: string | null) => (value ? new Date(value) : null);

/** low_credit_alerts (migration 086): low_credit_agencies plus a period key that does not move inside a period. */
export async function listLowCreditAgencies(db: Db = createServiceClient()): Promise<LowCreditAgency[]> {
  const { data, error } = await db.rpc("low_credit_alerts");
  if (error) throw new Error(`low_credit_alerts failed: ${error.message}`);
  return data
    .filter((row) => LEVELS.has(row.level))
    .map((row) => ({
      agencyId: row.agency_id,
      level: row.level as LowCreditAgency["level"],
      used: row.used,
      total: row.total,
      balance: row.balance,
      periodEnd: dateOrNull(row.period_end),
      periodKey: dateOrNull(row.period_key),
      periodStartedAt: dateOrNull(row.period_started_at),
    }));
}

export type SentLowCredits = { agencyId: string; idempotencyKey: string; sentAt: Date };

/** The low credits emails these agencies were sent since `since`, under any key format (BUG-280). */
export async function listSentLowCredits(agencyIds: string[], since: Date, db: Db = createServiceClient()): Promise<SentLowCredits[]> {
  if (agencyIds.length === 0) return [];
  const { data, error } = await db
    .from("email_log")
    .select("agency_id, idempotency_key, sent_at")
    .eq("type", "low_credits")
    .eq("status", "sent")
    .in("agency_id", agencyIds)
    .gte("sent_at", since.toISOString());
  if (error) throw new Error(`email_log lookup failed: ${error.message}`);
  return data.flatMap((row) =>
    row.agency_id && row.idempotency_key ? [{ agencyId: row.agency_id, idempotencyKey: row.idempotency_key, sentAt: new Date(row.sent_at) }] : [],
  );
}

export type ReportAgency = { id: string; ownerUserId: string };

/** Paying or trialing agencies that still want the weekly report. Never a test agency: its scores are sample data (D-61). */
export async function listWeeklyReportAgencies(db: Db = createServiceClient()): Promise<ReportAgency[]> {
  const { data, error } = await db
    .from("agencies")
    .select("id, owner_user_id")
    .eq("weekly_report_emails", true)
    .eq("is_test", false)
    .in("status", ["trialing", "active"])
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error(`Could not load agencies for the weekly report: ${error.message}`);
  return data.map((a) => ({ id: a.id, ownerUserId: a.owner_user_id }));
}

export async function ownerOf(agencyId: string, db: Db = createServiceClient()): Promise<string | null> {
  const { data, error } = await db.from("agencies").select("owner_user_id").eq("id", agencyId).maybeSingle();
  if (error) throw new Error(`Could not load the agency: ${error.message}`);
  return data?.owner_user_id ?? null;
}

// Businesses read at once: each is a few reads (a new report when a scan changed it), and a big agency must fit in
// one run (jobs.ts TIME_BUDGET_MS).
const BUSINESSES_AT_ONCE = 4;

/**
 * One business as the weekly report shows it: its current report (D-90), saved now if a scan changed the numbers,
 * which also adds the report's fixes to Actions. The link is the business's share link, which opens the PDF.
 */
async function reportBusiness(agencyId: string, business: { id: string; name: string; models: string[] }, now: Date): Promise<ReportedBusiness> {
  const report = await currentReport(agencyId, business.id, now);
  const snapshot = report && report !== "empty" ? report.snapshot : null;
  const share = snapshot ? await shareForEmail(agencyId, business.id) : null;
  return weeklyBusiness({ name: business.name, snapshot, sharePath: share?.path ?? null, models: business.models });
}

/**
 * Every finished business of the agency, as the weekly report shows it. `outOfTime` is checked before each group of
 * businesses: once it says so, this throws OutOfTime and the agency is left for the next run.
 */
export async function weeklyBusinesses(
  agencyId: string,
  now: Date,
  outOfTime: () => boolean = () => false,
  db: Db = createServiceClient(),
): Promise<ReportedBusiness[]> {
  const { data, error } = await db
    .from("businesses")
    .select("id, name, models")
    .eq("agency_id", agencyId)
    .neq("status", "onboarding")
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error(`Could not load businesses: ${error.message}`);

  const businesses: ReportedBusiness[] = [];
  for (let i = 0; i < data.length; i += BUSINESSES_AT_ONCE) {
    if (outOfTime()) throw new OutOfTime();
    const group = data.slice(i, i + BUSINESSES_AT_ONCE);
    businesses.push(...(await Promise.all(group.map((b) => reportBusiness(agencyId, b, now)))));
  }
  return businesses;
}
