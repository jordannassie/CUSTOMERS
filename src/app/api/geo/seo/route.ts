/**
 * GET /api/geo/seo?businessId=<id>[&refresh=1]
 *
 * Returns cached SEO snapshot for the business domain.
 * If refresh=1 (or cache is older than 7 days), re-fetches from DataForSEO.
 *
 * Cost: DataForSEO calls are ~$0.05–0.25 per full snapshot — results are
 * cached in seo_snapshots for 7 days and only refreshed on explicit request
 * or when the cache has expired.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { fetchSeoSnapshot, dataForSeoEnabled } from "@/lib/seo/dataforseo";
import type { SeoSnapshot } from "@/lib/seo/types";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("businessId");
  const forceRefresh = searchParams.get("refresh") === "1";

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  // Verify ownership via RLS
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, domain, name")
    .eq("id", businessId)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  if (!business.domain) {
    return NextResponse.json(
      { ok: false, reason: "no_domain", message: "No domain configured for this business. Add your website in Settings." },
      { status: 200 },
    );
  }

  if (!dataForSeoEnabled) {
    return NextResponse.json(
      { ok: false, reason: "not_configured", message: "SEO intelligence is not configured on this server." },
      { status: 200 },
    );
  }

  // Check cache
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("seo_snapshots")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at as string).getTime();
      if (age < CACHE_TTL_MS) {
        const snapshot: SeoSnapshot = {
          businessId,
          domain: cached.domain as string,
          overview: (cached.overview as SeoSnapshot["overview"]) ?? {},
          topKeywords: (cached.top_keywords as SeoSnapshot["topKeywords"]) ?? [],
          competitors: (cached.competitors as SeoSnapshot["competitors"]) ?? [],
          backlinks: (cached.backlinks as SeoSnapshot["backlinks"]) ?? {},
          keywordGaps: (cached.keyword_gaps as SeoSnapshot["keywordGaps"]) ?? [],
          fetchedAt: cached.fetched_at as string,
        };
        return NextResponse.json({ ok: true, snapshot, cached: true });
      }
    }
  }

  // Fetch fresh data from DataForSEO
  let snapshot: SeoSnapshot;
  try {
    snapshot = await fetchSeoSnapshot(businessId, business.domain);
  } catch (err) {
    const message = err instanceof Error ? err.message : "DataForSEO request failed.";
    console.error("[seo/route] DataForSEO error:", message);
    return NextResponse.json(
      { ok: false, reason: "api_error", message },
      { status: 200 },
    );
  }

  // Persist to cache (upsert by business_id)
  const { error: upsertError } = await supabase.from("seo_snapshots").upsert(
    {
      business_id: businessId,
      domain: snapshot.domain,
      overview: snapshot.overview,
      top_keywords: snapshot.topKeywords,
      competitors: snapshot.competitors,
      backlinks: snapshot.backlinks,
      keyword_gaps: snapshot.keywordGaps,
      fetched_at: snapshot.fetchedAt,
    },
    { onConflict: "business_id" },
  );

  if (upsertError) {
    console.error("[seo/route] cache upsert failed:", upsertError.message);
    // Non-fatal — still return the data
  }

  return NextResponse.json({ ok: true, snapshot, cached: false });
}
