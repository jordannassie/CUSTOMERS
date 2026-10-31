import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { SCORE_WINDOW_DAYS } from "../scoring";
import { alsoRecommendedNames, type AlsoRecommendedList } from "./names";
import { citedHosts, siteForName } from "./site-match";

const PAGE = 1000;
const DAY_MS = 86_400_000;

/** Callers check the user may see this agency first. Null when the business is not the agency's. */
export async function loadAlsoRecommended(agencyId: string, businessId: string, now: Date): Promise<AlsoRecommendedList | null> {
  return loadOnce(agencyId, businessId, now.getTime());
}

// The Overview asks twice (its competitor blocks and "Who AI picked instead"); React's cache reads once per request.
const loadOnce = cache(async (agencyId: string, businessId: string, nowMs: number): Promise<AlsoRecommendedList | null> => {
  const now = new Date(nowMs);
  const db = createServiceClient();
  const [business, competitors] = await Promise.all([
    db
      .from("businesses")
      .select("name, domain, aliases, phone, has_website, primary_city")
      .eq("id", businessId)
      .eq("agency_id", agencyId)
      .maybeSingle(),
    db.from("business_competitors").select("name, aliases, domain, phone, city").eq("business_id", businessId),
  ]);
  for (const r of [business, competitors]) if (r.error) throw new Error(`Also recommended: ${r.error.message}`);
  if (!business.data) return null;
  const b = business.data;

  const since = new Date(now.getTime() - SCORE_WINDOW_DAYS * DAY_MS).toISOString();
  const extractions: unknown[] = [];
  const hosts = new Set<string>();
  const seen = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      // The rows that count (migration 044, BUG-075), keyed without their text (migration 088).
      .from("visibility_checks_all")
      .select("answer_key, extracted_names, cited_sources")
      .eq("business_id", businessId)
      .gt("checked_at", since)
      .not("extracted_names", "is", null)
      .order("checked_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Also recommended: could not read checks: ${error.message}`);
    for (const r of data) {
      // A same-day rescan saves the same cached answer again; it counts once (BUG-110). An answer with no text is
      // keyed by its own id, so it is never taken for another.
      if (seen.has(r.answer_key!)) continue;
      seen.add(r.answer_key!);
      extractions.push(r.extracted_names);
      for (const host of citedHosts(r.cited_sources)) hosts.add(host);
    }
    if (data.length < PAGE) break;
  }

  const list = alsoRecommendedNames(
    extractions,
    {
      name: b.name,
      aliases: b.aliases,
      website: b.domain,
      phone: b.phone,
      city: b.primary_city,
      hasWebsite: b.has_website ?? Boolean(b.domain),
    },
    competitors.data!.map((c) => ({ name: c.name, aliases: c.aliases, website: c.domain, phone: c.phone, city: c.city ?? b.primary_city })),
  );
  return {
    ...list,
    names: list.names.map((n) => {
      const domain = siteForName(n.name, hosts);
      return domain ? { ...n, domain } : n;
    }),
  };
});
