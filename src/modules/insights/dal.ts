import "server-only";
// Database access for "why competitors win" (B-51). The worker runs explainAfterScan with the service
// role (no user session); the page reads through getLiveOpportunities, which checks the agency first.
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { fetchPlaceSignals } from "@/modules/competitors/server";
import { loadAlsoRecommended } from "@/modules/scanning";
import type { Opportunity } from "@/types/geo";
import { explain, type Explanation, type WriteExplanation } from "./explain";
import type { ExplainSources, Signals } from "./facts";
import { fillOpportunity, liveLookup, planSave, referencedCompetitors, usageCostUsd, usesBusinessValues } from "./service";
import { templateWriter } from "./template-writer";
import { createExplanationWriter } from "./writer";

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
  const runResult = await db.from("visibility_runs").select("business_id").eq("id", runId).single();
  const businessId = must("load the scan run", runResult).business_id;
  const [business, competitors, checks, facts] = await Promise.all([
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
      .select("provider, question, business_mentioned, competitors_mentioned, cited_sources")
      .eq("run_id", runId)
      .order("id"),
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
    checks: must("load the checks", checks).map((c) => ({
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
  return env.ANTHROPIC_API_KEY ? createExplanationWriter(env.ANTHROPIC_API_KEY) : null;
}

/** Explains one finished scan run and replaces the business's open opportunities with the result. */
export async function explainAfterScan(runId: string, deps: ExplainDeps = {}): Promise<Explanation> {
  const { sources, businessId, ownerUserId, isTest } = await loadSources(runId, deps);
  const explanation = await explain(sources, pickWriter(isTest, deps));
  await saveDrafts(businessId, explanation);
  if (explanation.usage && explanation.model) {
    const { error } = await createServiceClient().from("usage_events").insert({
      account_user_id: ownerUserId,
      business_id: businessId,
      usage_type: "other",
      provider: "anthropic",
      model: explanation.model,
      input_tokens: explanation.usage.inputTokens,
      output_tokens: explanation.usage.outputTokens,
      request_count: 1,
      estimated_cost_usd: usageCostUsd(explanation.usage),
    });
    if (error) throw new Error(`Insights: could not record usage: ${error.message}`);
  }
  return explanation;
}

async function saveDrafts(businessId: string, explanation: Explanation): Promise<void> {
  const db = createServiceClient();
  const existing = must(
    "load opportunities",
    await db.from("opportunities").select("id, title, status").eq("business_id", businessId),
  );
  const { insert, removeIds } = planSave(existing, explanation.drafts);
  // Insert first, so a failure leaves the old list rather than an empty one.
  if (insert.length > 0) {
    const { error } = await db.from("opportunities").insert(insert.map((d) => ({ ...d, business_id: businessId, status: "open" })));
    if (error) throw new Error(`Insights: could not save opportunities: ${error.message}`);
  }
  if (removeIds.length > 0) {
    const { error } = await db.from("opportunities").delete().in("id", removeIds).eq("status", "open");
    if (error) throw new Error(`Insights: could not replace old opportunities: ${error.message}`);
  }
}

/** Opportunities for one of the signed-in agency's businesses, with Google values filled in live. */
export async function getLiveOpportunities(businessId: string, fetchSignals: FetchSignals = fetchPlaceSignals): Promise<Opportunity[] | null> {
  const { agency } = await requireAgency({ next: "/dashboard/opportunities" });
  const db = createServiceClient();
  const business = await db.from("businesses").select("places_id").eq("id", businessId).eq("agency_id", agency.id).maybeSingle();
  if (business.error) throw new Error(`Insights: could not load the business: ${business.error.message}`);
  if (!business.data) return null;

  const rows = must(
    "load opportunities",
    await db
      .from("opportunities")
      .select(
        "id, business_id, title, description, evidence, impact, category, affected_url, status, recommended_action, claude_prompt, created_at, updated_at",
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
  const signals = await signalsFor([businessPlace, ...placeOf.values()], fetchSignals);
  const lookup = liveLookup(businessPlace, placeOf, signals);
  return rows.map((row) => fillOpportunity(row, lookup));
}
