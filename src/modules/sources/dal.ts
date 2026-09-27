import "server-only";
import { requireAgency } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sourcesView, type SourceCheck, type SourcesView } from "./service";

export type SourcesPage = SourcesView & { place: string | null };

// Same 30-day window as the visibility score (D-64).
const WINDOW_DAYS = 30;
const PAGE = 1000;
const DAY_MS = 86_400_000;

/** Sources for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getSources(businessId: string, now = new Date()): Promise<SourcesPage | null> {
  const { agency } = await requireAgency({ next: "/sources" });
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select("id, domain, primary_city, primary_region")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .maybeSingle();
  if (error) throw new Error(`Sources: could not read the business: ${error.message}`);
  if (!business) return null;

  const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS).toISOString();
  const checks: SourceCheck[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error: readError } = await db
      .from("visibility_results")
      .select("provider, cited_sources, created_at")
      .eq("business_id", businessId)
      .gt("created_at", since)
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (readError) throw new Error(`Sources: could not read checks: ${readError.message}`);
    for (const r of data) checks.push({ provider: r.provider, citations: r.cited_sources, checkedAt: r.created_at });
    if (data.length < PAGE) break;
  }
  const place = [business.primary_city, business.primary_region].filter(Boolean).join(", ") || null;
  return { ...sourcesView(checks, business.domain), place };
}
