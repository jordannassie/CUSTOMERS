import "server-only";
import { searchGooglePlaces } from "@/lib/google-places";

export interface CompetitorSuggestion {
  name: string;
  domain: string | null;
  source: string;
}

function toDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Suggests 3-5 real competitors via Google Places. Never fabricated — every
 * suggestion is an actual business Google Places returned for the query.
 * The calling business is excluded by domain/name match. The user must
 * confirm each suggestion during onboarding before it's saved.
 */
export async function discoverCompetitors(
  industry: string,
  city: string | null,
  region: string | null,
  excludeDomain: string | null,
): Promise<CompetitorSuggestion[]> {
  const location = [city, region].filter(Boolean).join(", ");
  const query = location ? `${industry} in ${location}` : industry;

  if (!process.env.GOOGLE_PLACES_API_KEY) return [];

  try {
    const result = await searchGooglePlaces(query, "quick");
    const seen = new Set<string>();
    const suggestions: CompetitorSuggestion[] = [];

    for (const business of result.businesses) {
      const domain = toDomain(business.website);
      if (excludeDomain && domain === excludeDomain) continue;
      const key = domain || business.businessName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        name: business.businessName,
        domain,
        source: "google_places",
      });
      if (suggestions.length >= 5) break;
    }

    return suggestions;
  } catch (error) {
    console.error("Competitor discovery failed:", error);
    return [];
  }
}
