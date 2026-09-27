import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { SCORE_WINDOW_DAYS } from "../scoring";
import { alsoRecommendedNames, type AlsoRecommendedList } from "./names";

const PAGE = 1000;
const DAY_MS = 86_400_000;

/** Callers check the user may see this agency first. Null when the business is not the agency's. */
export async function loadAlsoRecommended(
  agencyId: string,
  businessId: string,
  now: Date,
): Promise<AlsoRecommendedList | null> {
  const db = createServiceClient();
  const [business, competitors] = await Promise.all([
    db
      .from("businesses")
      .select("name, domain, aliases, phone, has_website, primary_city")
      .eq("id", businessId)
      .eq("agency_id", agencyId)
      .maybeSingle(),
    db.from("business_competitors").select("name, domain, phone, city").eq("business_id", businessId),
  ]);
  for (const r of [business, competitors]) if (r.error) throw new Error(`Also recommended: ${r.error.message}`);
  if (!business.data) return null;
  const b = business.data;

  const since = new Date(now.getTime() - SCORE_WINDOW_DAYS * DAY_MS).toISOString();
  const extractions: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("visibility_results")
      .select("extracted_names")
      .eq("business_id", businessId)
      .gt("created_at", since)
      .not("extracted_names", "is", null)
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Also recommended: could not read checks: ${error.message}`);
    for (const r of data) extractions.push(r.extracted_names);
    if (data.length < PAGE) break;
  }

  return alsoRecommendedNames(
    extractions,
    {
      name: b.name,
      aliases: b.aliases,
      website: b.domain,
      phone: b.phone,
      city: b.primary_city,
      hasWebsite: b.has_website ?? Boolean(b.domain),
    },
    competitors.data!.map((c) => ({ name: c.name, website: c.domain, phone: c.phone, city: c.city ?? b.primary_city })),
  );
}
