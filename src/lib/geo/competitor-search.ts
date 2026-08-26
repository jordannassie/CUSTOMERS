/**
 * Competitor Places search — server-side only.
 *
 * Used by the dashboard CompetitorsManager to provide real-business
 * autocomplete when the user types a competitor name.
 *
 * Results are biased toward the active business location using the query
 * construction: "{query} near {city}, {region}" and the Google Places
 * locationBias field when coordinates are available.
 *
 * Returns empty array when GOOGLE_PLACES_API_KEY is not set.
 */
import "server-only";
import { searchGooglePlaces } from "@/lib/google-places";

export interface CompetitorPlaceResult {
  /** Google Place ID — use to prevent duplicates */
  placeId: string;
  name: string;
  /** Formatted city name */
  city: string | null;
  /** State / region abbreviation or full name */
  state: string | null;
  /** Full formatted address from Places */
  formattedAddress: string | null;
  /** Primary business category */
  category: string | null;
  /** Full website URL as returned by Places */
  website: string | null;
  /** Normalized root domain (no www, no protocol) */
  domain: string | null;
  /** Phone number */
  phone: string | null;
  /** Google Maps URL */
  mapsUrl: string | null;
}

function normalizeDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Searches for competitor businesses using Google Places.
 *
 * @param query    Free-text competitor name typed by the user
 * @param city     Active business primary city (for location bias)
 * @param region   Active business primary region
 * @param excludeDomain  Owner domain to exclude from results
 */
export async function searchCompetitorPlaces(
  query: string,
  city: string | null,
  region: string | null,
  excludeDomain: string | null,
): Promise<CompetitorPlaceResult[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Bias query toward active business location
  const locationHint = [city, region].filter(Boolean).join(", ");
  const biasedQuery = locationHint ? `${trimmed} near ${locationHint}` : trimmed;

  try {
    const result = await searchGooglePlaces(biasedQuery, "quick");
    const seen = new Set<string>();
    const places: CompetitorPlaceResult[] = [];

    for (const biz of result.businesses) {
      if (!biz.placeId) continue;
      if (seen.has(biz.placeId)) continue;

      const domain = normalizeDomain(biz.website);
      if (excludeDomain && domain === excludeDomain) continue;

      seen.add(biz.placeId);
      places.push({
        placeId: biz.placeId,
        name: biz.businessName,
        city: biz.city,
        state: biz.state,
        formattedAddress: biz.address,
        category: biz.category,
        website: biz.website,
        domain,
        phone: biz.phone,
        mapsUrl: biz.mapsUrl,
      });

      if (places.length >= 6) break;
    }

    return places;
  } catch (err) {
    console.error("[competitor-search] Places search failed:", err);
    return [];
  }
}
