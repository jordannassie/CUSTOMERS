import "server-only";
import { createHash } from "node:crypto";
import { requireAgency } from "@/modules/auth";
import { actionStates, type ActionStatus } from "@/modules/opportunities";
import type { ProviderId } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { answerNames } from "./names";
import { actionKeys, sourceRows, type ListedSite, type SiteRow } from "./rows";
import { sourcesView, type SourceCheck, type SourcesView } from "./service";
import { TOOL_LABELS } from "./tools";

export type SourcesPage = Omit<SourcesView, "sites"> & {
  place: string | null;
  tool: ProviderId | null;
  listed: ListedSite[];
  sites: SiteRow[];
};

// Same 30-day window as the visibility score (D-64).
const WINDOW_DAYS = 30;
const PAGE = 1000;
const DAY_MS = 86_400_000;

/** Sources for one of the signed-in agency's businesses, for all AI tools or one; null when it is not theirs. */
export async function getSources(businessId: string, tool: ProviderId | null = null, now = new Date()): Promise<SourcesPage | null> {
  const { agency } = await requireAgency({ next: "/sources" });
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select("id, name, domain, primary_city, primary_region")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .maybeSingle();
  if (error) throw new Error(`Sources: could not read the business: ${error.message}`);
  if (!business) return null;

  const { data: competitors, error: rivalsError } = await db
    .from("business_competitors")
    .select("id, name, domain, aliases")
    .eq("business_id", businessId);
  if (rivalsError) throw new Error(`Sources: could not read competitors: ${rivalsError.message}`);

  const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS).toISOString();
  const checks: SourceCheck[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error: readError } = await db
      // The rows that count: no sample answers once the agency is real (migration 044, BUG-075).
      .from("visibility_results_counted")
      .select("id, provider, cited_sources, created_at, business_mentioned, competitors_mentioned, extracted_names, answer_text")
      .eq("business_id", businessId)
      .gt("created_at", since)
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (readError) throw new Error(`Sources: could not read checks: ${readError.message}`);
    for (const r of data) {
      const mentioned = r.business_mentioned === true;
      checks.push({
        provider: r.provider!,
        citations: r.cited_sources,
        checkedAt: r.created_at!,
        // The score's answer key (scores/dal.ts): a cached answer repeats the text it reused, so it counts once.
        answerKey: r.answer_text === null ? r.id! : createHash("md5").update(r.provider! + r.answer_text).digest("hex"),
        mentioned,
        names: answerNames(r.extracted_names, r.competitors_mentioned, mentioned, business.name),
      });
    }
    if (data.length < PAGE) break;
  }

  const view = sourcesView(checks, { ownDomain: business.domain, businessName: business.name, competitors, tool });
  const place = [business.primary_city, business.primary_region].filter(Boolean).join(", ") || null;
  // Which sites are already in Actions only changes a button's label, so the page still loads if that read fails.
  const states = await actionStates(businessId, actionKeys(view)).catch((e: unknown) => {
    console.error("Sources: could not read added fixes", e);
    return new Map<string, { status: ActionStatus }>();
  });
  const { listed, rows } = sourceRows(view, { place: business.primary_city ?? place, toolLabel: tool ? TOOL_LABELS[tool] : null }, states);
  return { ...view, sites: rows, listed, place, tool };
}
