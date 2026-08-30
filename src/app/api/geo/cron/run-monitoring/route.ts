import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runVisibilityForBusiness } from "@/lib/geo/run-visibility";
import { generateOpportunities } from "@/lib/geo/opportunity-engine";
import { CANONICAL_PLANS, getPlanConfig, type CanonicalPlanId } from "@/config/pricing";
import { betaFreeAccess } from "@/config/product-access";

export const maxDuration = 60;

const RETRY_LIMIT = 1;
const MAX_BUSINESSES_PER_INVOCATION = 20;

/**
 * Returns the scan cadence in days for a given plan.
 * Uses the canonical pricing config as the single source of truth.
 */
function getScanCadenceDays(planId: string | null | undefined): number {
  if (!planId || planId === "beta" || planId === "none") {
    // Beta users get Growth-level cadence (weekly)
    return betaFreeAccess ? CANONICAL_PLANS.growth.scanCadenceDays : 30;
  }
  return getPlanConfig(planId).scanCadenceDays;
}

/**
 * Returns the max prompts for a scan run based on the business plan.
 * Uses the canonical pricing config — never hardcoded.
 */
function getMaxPromptsForPlan(planId: string | null | undefined): number {
  if (!planId || planId === "beta" || planId === "none") {
    // Beta uses Growth limits
    return betaFreeAccess ? CANONICAL_PLANS.growth.maxTrackedPrompts : CANONICAL_PLANS.starter.maxTrackedPrompts;
  }
  const plan = getPlanConfig(planId);
  return plan.maxTrackedPrompts === -1 ? 999 : plan.maxTrackedPrompts;
}

/**
 * Returns whether a business should run scans at all.
 * Canceled businesses are skipped unless in beta mode.
 */
function shouldRunScan(status: string | null | undefined): boolean {
  if (betaFreeAccess) return true; // Beta: always run for active businesses
  return status === "active" || status === "trialing";
}

/**
 * Scheduled monitoring entry point.
 * Called daily by Netlify Scheduled Function.
 *
 * Plan enforcement:
 *   - Uses canonical pricing config for cadence and prompt limits
 *   - Starter: monthly cadence, 25 prompts
 *   - Growth:  weekly cadence, 75 prompts
 *   - Pro:     weekly full scan (150 prompts) + up to 25 daily priority prompts
 *   - Beta:    Growth-equivalent limits
 *   - Canceled/inactive businesses: skipped
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.GEO_CRON_SECRET || secret !== process.env.GEO_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, domain, primary_city, primary_region")
    .eq("status", "active")
    .limit(200);

  if (error || !businesses) {
    return NextResponse.json({ error: "Could not load businesses." }, { status: 500 });
  }

  const results: Array<{
    businessId: string;
    ran: boolean;
    reason?: string;
    score?: number | null;
    promptsRan?: number;
  }> = [];
  let processed = 0;

  for (const business of businesses) {
    if (processed >= MAX_BUSINESSES_PER_INVOCATION) break;

    // Get billing item to determine plan and scan eligibility
    const { data: billingItem } = await supabase
      .from("business_billing_items")
      .select("plan_id, status")
      .eq("business_id", business.id)
      .maybeSingle();

    const planId = billingItem?.plan_id ?? "beta";
    const billingStatus = billingItem?.status ?? "beta";

    // Skip canceled/inactive businesses (except in beta mode)
    if (!shouldRunScan(billingStatus)) {
      results.push({ businessId: business.id, ran: false, reason: `billing status: ${billingStatus}` });
      continue;
    }

    const cadenceDays = getScanCadenceDays(planId);
    const maxPrompts = getMaxPromptsForPlan(planId);

    // Check when this business was last scanned
    const { data: lastScore } = await supabase
      .from("visibility_scores")
      .select("calculated_at")
      .eq("business_id", business.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const dueAt = lastScore
      ? new Date(new Date(lastScore.calculated_at).getTime() + cadenceDays * 24 * 60 * 60 * 1000)
      : new Date(0); // Never scanned — always due

    // For Pro businesses: also check if daily priority prompts should run
    const isPro = planId === "pro";
    const dailyWatchLimit = isPro ? CANONICAL_PLANS.pro.dailyWatchPromptLimit : 0;
    const isFullScanDue = dueAt <= new Date();

    if (!isFullScanDue && !isPro) {
      results.push({ businessId: business.id, ran: false, reason: "not due yet" });
      continue;
    }

    // Duplicate-run protection
    const { data: inFlight } = await supabase
      .from("visibility_runs")
      .select("id")
      .eq("business_id", business.id)
      .in("status", ["pending", "running"])
      .gte("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (inFlight) {
      results.push({ businessId: business.id, ran: false, reason: "run already in flight" });
      continue;
    }

    // Determine how many prompts to run
    let promptsToRun = isFullScanDue ? maxPrompts : 0;

    // Pro: always run up to dailyWatchLimit priority prompts daily
    if (isPro && !isFullScanDue && dailyWatchLimit > 0) {
      promptsToRun = dailyWatchLimit;
    }

    if (promptsToRun === 0) {
      results.push({ businessId: business.id, ran: false, reason: "no prompts to run" });
      continue;
    }

    let outcome = await runVisibilityForBusiness(supabase, business, {
      maxPrompts: promptsToRun,
    });

    let attempts = 0;
    while (outcome.promptsSucceeded === 0 && attempts < RETRY_LIMIT) {
      attempts += 1;
      outcome = await runVisibilityForBusiness(supabase, business, {
        maxPrompts: promptsToRun,
      });
    }

    processed += 1;

    if (outcome.promptsSucceeded > 0) {
      const { data: runResults } = await supabase
        .from("visibility_results")
        .select("business_mentioned, competitors_mentioned, cited_sources")
        .eq("run_id", outcome.runId);

      const { data: businessRow } = await supabase
        .from("businesses")
        .select("description, primary_city")
        .eq("id", business.id)
        .single();

      const drafts = generateOpportunities({
        businessName: business.name,
        domain: business.domain,
        description: businessRow?.description ?? null,
        primaryCity: businessRow?.primary_city ?? null,
        results: runResults ?? [],
      });

      await supabase
        .from("opportunities")
        .delete()
        .eq("business_id", business.id)
        .eq("status", "open");

      if (drafts.length > 0) {
        await supabase.from("opportunities").insert(
          drafts.map((d) => ({ business_id: business.id, status: "open" as const, ...d }))
        );
      }
    }

    results.push({
      businessId: business.id,
      ran: true,
      score: outcome.score,
      reason: outcome.error,
      promptsRan: outcome.promptsSucceeded,
    });
  }

  return NextResponse.json({ processed, results });
}
