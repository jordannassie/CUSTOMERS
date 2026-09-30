import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { loadOverview } from "@/modules/overview";
import { shareForEmail } from "@/modules/reports";
import type { WeeklyBusiness } from "@/modules/email";
import type { Database } from "@/types/database.types";
import { weeklyBusiness, type LowCreditAgency, type NewOpportunity } from "./service";

// The scheduled emails run from pg_cron with no signed-in user, so every read here uses the service role,
// after the route has checked the worker secret.
type Db = SupabaseClient<Database>;

const WEEK_MS = 7 * 86_400_000;
const OPEN_OPPORTUNITIES = ["open", "in_progress"];

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

export async function listLowCreditAgencies(db: Db = createServiceClient()): Promise<LowCreditAgency[]> {
  const { data, error } = await db.rpc("low_credit_agencies");
  if (error) throw new Error(`low_credit_agencies failed: ${error.message}`);
  return data
    .filter((row) => LEVELS.has(row.level))
    .map((row) => ({
      agencyId: row.agency_id,
      level: row.level as LowCreditAgency["level"],
      used: row.used,
      total: row.total,
      balance: row.balance,
      periodEnd: row.period_end ? new Date(row.period_end) : null,
    }));
}

export type ReportAgency = { id: string; ownerUserId: string };

/** Paying or trialing agencies that still want the weekly report. */
export async function listWeeklyReportAgencies(db: Db = createServiceClient()): Promise<ReportAgency[]> {
  const { data, error } = await db
    .from("agencies")
    .select("id, owner_user_id")
    .eq("weekly_report_emails", true)
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

async function newOpportunities(db: Db, businessId: string, now: Date): Promise<NewOpportunity[]> {
  const { data, error } = await db
    .from("opportunities")
    .select("title, impact, created_at")
    .eq("business_id", businessId)
    .in("status", OPEN_OPPORTUNITIES)
    .gte("created_at", new Date(now.getTime() - WEEK_MS).toISOString());
  if (error) throw new Error(`Could not load new opportunities: ${error.message}`);
  return data.map((o) => ({ title: o.title, impact: o.impact as NewOpportunity["impact"], createdAt: o.created_at }));
}

/** Every finished business of the agency, as the weekly report shows it. */
export async function weeklyBusinesses(agencyId: string, now: Date, db: Db = createServiceClient()): Promise<WeeklyBusiness[]> {
  const { data, error } = await db
    .from("businesses")
    .select("id, name")
    .eq("agency_id", agencyId)
    .neq("status", "onboarding")
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error(`Could not load businesses: ${error.message}`);

  const businesses: WeeklyBusiness[] = [];
  for (const business of data) {
    const [overview, opportunities] = await Promise.all([
      loadOverview(agencyId, business.id, now),
      newOpportunities(db, business.id, now),
    ]);
    const share = overview?.score ? await shareForEmail(agencyId, business.id) : null;
    businesses.push(
      weeklyBusiness({ name: business.name, overview, newOpportunities: opportunities, reportPath: share?.path ?? "/dashboard" }),
    );
  }
  return businesses;
}
