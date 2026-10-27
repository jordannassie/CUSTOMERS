import "server-only";
// Database access for "why competitors win" (B-51). The worker runs explainAfterScan with the service
// role (no user session); the page reads through getLiveOpportunities, which checks the agency first.
import { createServiceClient } from "@/lib/supabase/service";
import { aiUsageMetadata, liveAiClients } from "@/modules/ai/server";
import { requireAgency } from "@/modules/auth";
import { fetchPlaceSignals } from "@/modules/competitors/server";
import { loadAlsoRecommended, splitByQuestion } from "@/modules/scanning";
import type { Opportunity } from "@/types/geo";
import { explain, type Explanation, type WriteExplanation } from "./explain";
import type { ExplainSources, Signals } from "./facts";
import { markExplained, recordExplainFallback, saveExplanation, type SaveOutcome } from "./save/dal";
import { fillOpportunity, hasPlaceValues, liveLookup, referencedCompetitors, usageCostUsd, usesBusinessValues } from "./service";
import { templateWriter } from "./template-writer";
import { createExplanationWriter } from "./writer";

/**
 * An opportunity with Google values filled in. usesGoogle: the text shows some, so attribution is due. googleValues:
 * its text has Google values to show, filled or not (a page that skipped Google offers "Show Google numbers").
 */
export type LiveOpportunity = Opportunity & { usesGoogle: boolean; googleValues: boolean };

/** Live Google signals for a place id; null when Google has no such place. */
type FetchSignals = (placeId: string) => Promise<Signals | null>;

export type ExplainDeps = {
  /** Null means "pick by agency": the template for test agencies, Claude otherwise. */
  write?: WriteExplanation | null;
  fetchSignals?: FetchSignals;
  now?: () => Date;
};

function must<T>(what: string, result: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(`Insights: could not ${what}: ${result.error.message}`);
  if (result.data == null) throw new Error(`Insights: could not ${what}: not found`);
  return result.data;
}

async function signalsFor(placeIds: (string | null)[], fetchSignals: FetchSignals): Promise<Map<string, Signals | null>> {
  const ids = [...new Set(placeIds.filter((id): id is string => id !== null))];
  const pairs = await Promise.all(ids.map(async (id) => [id, await fetchSignals(id).catch(() => null)] as const));
  return new Map(pairs);
}

async function loadSources(runId: string, deps: ExplainDeps) {
  const db = createServiceClient();
  const runResult = await db.from("visibility_runs").select("business_id, provider").eq("id", runId).single();
  const run = must("load the scan run", runResult);
  const businessId = run.business_id;
  const [business, competitors, checks, questions, facts] = await Promise.all([
    db
      .from("businesses")
      .select(
        "id, owner_user_id, agency_id, name, primary_city, primary_region, industry, domain, has_website, description, services, places_id",
      )
      .eq("id", businessId)
      .single(),
    db.from("business_competitors").select("id, name, places_id, place_id").eq("business_id", businessId).order("created_at"),
    db
      .from("visibility_results")
      .select("provider, question, business_mentioned, competitors_mentioned, cited_sources, tracked_prompt_id")
      .eq("run_id", runId)
      .order("id"),
    db.from("tracked_prompts").select("id, source, active").eq("business_id", businessId),
    db.from("business_site_facts").select("data").eq("business_id", businessId).maybeSingle(),
  ]);
  const b = must("load the business", business);
  if (!b.agency_id) throw new Error("Insights: the business has no agency");
  const agencyResult = await db.from("agencies").select("is_test").eq("id", b.agency_id).single();
  const agency = must("load the agency", agencyResult);
  const also = await loadAlsoRecommended(b.agency_id, businessId, (deps.now ?? (() => new Date()))());
  const rivals = must("load the competitors", competitors).map((c) => ({ id: c.id, name: c.name, placesId: c.places_id ?? c.place_id }));
  const signals = await signalsFor([b.places_id, ...rivals.map((c) => c.placesId)], deps.fetchSignals ?? fetchPlaceSignals);

  const sources: ExplainSources = {
    business: {
      name: b.name,
      city: b.primary_city,
      region: b.primary_region,
      industry: b.industry,
      domain: b.domain,
      hasWebsite: b.has_website ?? Boolean(b.domain),
      description: b.description,
      services: b.services,
      placesId: b.places_id,
    },
    competitors: rivals,
    models: run.provider.split(",").map((m) => m.trim()).filter(Boolean),
    // The answers the score counts, so the reasons quote the same numbers as the score (BUG-129).
    checks: splitByQuestion(
      must("load the checks", checks).map((c) => ({ ...c, questionId: c.tracked_prompt_id ?? "none" })),
      must("load the questions", questions),
    ).scored.map((c) => ({
      provider: c.provider,
      question: c.question ?? "",
      businessMentioned: c.business_mentioned,
      competitorsMentioned: c.competitors_mentioned,
      citations: c.cited_sources,
    })),
    alsoNamed: also?.names ?? [],
    siteFacts: facts.data?.data ?? null,
    signals,
  };
  return { sources, businessId, ownerUserId: b.owner_user_id, isTest: agency.is_test };
}

function pickWriter(isTest: boolean, deps: ExplainDeps): WriteExplanation | null {
  // Test agencies never reach a live model, whatever was passed in (D-61).
  if (isTest) return templateWriter;
  if (deps.write !== undefined && deps.write !== null) return deps.write;
  const ai = liveAiClients();
  return ai.anthropic || ai.openai ? createExplanationWriter(ai) : null;
}

/**
 * Explains one finished scan run and saves the fixes (save/dal.ts): the cost is recorded, a fallback to the fixed rules
 * is logged to provider_errors, and the run is marked explained even when a step fails.
 */
export async function explainAfterScan(runId: string, deps: ExplainDeps = {}): Promise<Explanation & { saved?: SaveOutcome }> {
  try {
    const { sources, businessId, ownerUserId, isTest } = await loadSources(runId, deps);
    const explanation = await explain(sources, pickWriter(isTest, deps));
    if (!isTest) await recordExplainFallback(explanation);
    const saved = await saveExplanation(businessId, runId, explanation);
    await recordUsage(explanation, ownerUserId, businessId);
    return { ...explanation, saved };
  } finally {
    await markExplained(runId);
  }
}

async function recordUsage(explanation: Explanation, ownerUserId: string, businessId: string): Promise<void> {
  if (!explanation.usage || !explanation.model) return;
  const { error } = await createServiceClient().from("usage_events").insert({
    account_user_id: ownerUserId,
    business_id: businessId,
    usage_type: "other",
    provider: explanation.writer?.provider ?? "anthropic",
    model: explanation.model,
    input_tokens: explanation.usage.inputTokens,
    output_tokens: explanation.usage.outputTokens,
    request_count: 1,
    estimated_cost_usd: usageCostUsd(explanation.usage, explanation.model),
    ...(explanation.writer && {
      metadata: aiUsageMetadata({ task: "why_competitors_win", fellBack: explanation.writer.fellBack, primaryError: explanation.writer.primaryError }),
    }),
  });
  if (error) throw new Error(`Insights: could not record usage: ${error.message}`);
}

/**
 * Opportunities for one of the signed-in agency's businesses, with Google values filled in live. `google: false`
 * asks Google nothing: sentences that need its values are left out (2026-10-27, Places calls only on request).
 */
export async function getLiveOpportunities(
  businessId: string,
  fetchSignals: FetchSignals = fetchPlaceSignals,
  { google = true }: { google?: boolean } = {},
): Promise<LiveOpportunity[] | null> {
  const { agency } = await requireAgency({ next: "/actions" });
  const db = createServiceClient();
  const business = await db.from("businesses").select("places_id").eq("id", businessId).eq("agency_id", agency.id).maybeSingle();
  if (business.error) throw new Error(`Insights: could not load the business: ${business.error.message}`);
  if (!business.data) return null;

  const rows = must(
    "load opportunities",
    await db
      .from("opportunities")
      .select(
        "id, business_id, title, description, evidence, impact, category, affected_url, status, recommended_action, claude_prompt, created_at, updated_at, where_to_apply, source, evidence_data, due_date, completed_at, assignee_id",
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
  ) as Opportunity[];

  const ids = referencedCompetitors(rows);
  const competitors =
    ids.size > 0
      ? must("load competitors", await db.from("business_competitors").select("id, places_id, place_id").in("id", [...ids]))
      : [];
  const placeOf = new Map(competitors.map((c) => [c.id, c.places_id ?? c.place_id]));
  const businessPlace = usesBusinessValues(rows) ? business.data.places_id : null;
  const signals = google ? await signalsFor([businessPlace, ...placeOf.values()], fetchSignals) : new Map();
  const lookup = liveLookup(businessPlace, placeOf, signals);
  return rows.map((row) => ({ ...fillOpportunity(row, lookup), usesGoogle: google && hasPlaceValues(row), googleValues: hasPlaceValues(row) }));
}
