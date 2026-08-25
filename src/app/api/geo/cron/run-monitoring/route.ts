import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runVisibilityForBusiness } from "@/lib/geo/run-visibility";
import { generateOpportunities } from "@/lib/geo/opportunity-engine";

export const maxDuration = 60;

const CADENCE_DAYS: Record<string, number> = {
  none: 30, // no active subscription yet — default to the base monthly cadence
  ai_visibility: 30,
  growth_agent: 7,
  autonomous_growth: 7,
};

const RETRY_LIMIT = 1; // additional attempt per business, on top of the first
const MAX_BUSINESSES_PER_INVOCATION = 20; // keep a single invocation well inside function time limits

/**
 * Scheduled monitoring entry point. Not user-facing — called by a Netlify
 * Scheduled Function (see netlify/functions/geo-scheduled-monitoring.mts)
 * with a shared secret. Iterates active businesses whose last scan is older
 * than their plan's monitoring cadence, runs a fresh visibility scan for
 * each, and regenerates opportunities from the results.
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

  const results: Array<{ businessId: string; ran: boolean; reason?: string; score?: number | null }> = [];
  let processed = 0;

  for (const business of businesses) {
    if (processed >= MAX_BUSINESSES_PER_INVOCATION) break;

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("business_id", business.id)
      .maybeSingle();
    const cadenceDays = CADENCE_DAYS[subscription?.plan ?? "none"] ?? 30;

    const { data: lastScore } = await supabase
      .from("visibility_scores")
      .select("calculated_at")
      .eq("business_id", business.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const dueAt = lastScore
      ? new Date(new Date(lastScore.calculated_at).getTime() + cadenceDays * 24 * 60 * 60 * 1000)
      : new Date(0); // never scanned — always due
    if (dueAt > new Date()) {
      results.push({ businessId: business.id, ran: false, reason: "not due yet" });
      continue;
    }

    // Duplicate-run protection: skip if a run is already in flight for this business.
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

    let outcome = await runVisibilityForBusiness(supabase, business, { maxPrompts: 25 });
    let attempts = 0;
    while (outcome.promptsSucceeded === 0 && attempts < RETRY_LIMIT) {
      attempts += 1;
      outcome = await runVisibilityForBusiness(supabase, business, { maxPrompts: 25 });
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

      await supabase.from("opportunities").delete().eq("business_id", business.id).eq("status", "open");
      if (drafts.length > 0) {
        await supabase
          .from("opportunities")
          .insert(drafts.map((d) => ({ business_id: business.id, status: "open" as const, ...d })));
      }
    }

    results.push({ businessId: business.id, ran: true, score: outcome.score, reason: outcome.error });
  }

  return NextResponse.json({ processed, results });
}
