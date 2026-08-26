/**
 * GET /api/geo/competitors/search?q={query}&businessId={id}
 *
 * Searches Google Places for businesses matching the query, biased toward
 * the active business location. Used by the CompetitorsManager autocomplete.
 *
 * Returns empty results (not an error) when:
 * - GOOGLE_PLACES_API_KEY is not configured
 * - Query is too short (< 2 chars)
 * - No matches found
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { searchCompetitorPlaces } from "@/lib/geo/competitor-search";

export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const businessId = searchParams.get("businessId") ?? "";

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Load business for location bias + domain exclusion (RLS ensures ownership)
  const { data: business } = await supabase
    .from("businesses")
    .select("primary_city, primary_region, domain")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const results = await searchCompetitorPlaces(
    query,
    business.primary_city,
    business.primary_region,
    business.domain,
  );

  return NextResponse.json({ results });
}
