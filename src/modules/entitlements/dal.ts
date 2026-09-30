import "server-only";
import { getBalance } from "@/modules/credits";
import { createServiceClient } from "@/lib/supabase/service";
import type { AgencyFacts, BusinessFacts } from "./service";

// Loads the facts the rules need. Callers check the user may see this agency or business first.

// A business with no subscription item yet (early onboarding) gets the smallest plan's limits.
const FALLBACK_PLAN_ID = "starter";

type Result<T> = { data: T; error: { message: string } | null; count?: number | null };

function check<T>(what: string, result: Result<T>): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data;
}

function found<T>(what: string, result: Result<T>): NonNullable<T> {
  const data = check(what, result);
  if (data == null) throw new Error(`Could not load ${what}: not found`);
  return data;
}

function countOf(what: string, result: Result<unknown>): number {
  check(what, result);
  return result.count ?? 0;
}

export async function loadAgencyFacts(agencyId: string): Promise<AgencyFacts> {
  const db = createServiceClient();
  const [agency, businesses, balance] = await Promise.all([
    db.from("agencies").select("id, status").eq("id", agencyId).single(),
    db.from("businesses").select("id", { count: "exact", head: true }).eq("agency_id", agencyId).is("deleted_at", null),
    getBalance(agencyId),
  ]);
  const row = found("agency", agency);
  return {
    id: row.id,
    status: row.status,
    businessCount: countOf("business count", businesses),
    balance: balance.balance ?? 0,
  };
}

export async function loadBusinessFacts(businessId: string): Promise<BusinessFacts> {
  const db = createServiceClient();
  const [business, subscription, questions, competitors, openJobs] = await Promise.all([
    db.from("businesses").select("id, agency_id").eq("id", businessId).single(),
    db.from("business_subscriptions").select("plan_id").eq("business_id", businessId).maybeSingle(),
    db.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
    db.from("business_competitors").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    db
      .from("scan_jobs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", ["queued", "running"]),
  ]);
  const row = found("business", business);
  const planId = check("subscription", subscription)?.plan_id ?? FALLBACK_PLAN_ID;
  const plan = found(
    "plan",
    await db.from("plans").select("name, max_questions, max_competitors").eq("id", planId).single(),
  );

  return {
    id: row.id,
    agencyId: row.agency_id,
    planName: plan.name,
    maxQuestions: plan.max_questions,
    maxCompetitors: plan.max_competitors,
    activeQuestionCount: countOf("questions", questions),
    competitorCount: countOf("competitors", competitors),
    hasOpenScan: countOf("scan jobs", openJobs) > 0,
  };
}
