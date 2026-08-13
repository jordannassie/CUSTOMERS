import "server-only";

import type { ProspectSearchResult } from "@/types/prospecting";

const HIGH_VALUE_CATEGORIES = [
  "med spa",
  "medical spa",
  "dentist",
  "dental",
  "orthodontist",
  "plastic surgery",
  "personal injury",
  "law firm",
  "attorney",
  "lawyer",
  "hvac",
  "air conditioning",
  "roofing",
  "roofer",
  "plumber",
  "plumbing",
  "chiropractor",
  "real estate",
  "home service",
];

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryType?: string;
}

interface PlacesResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

function inferCategory(primaryType?: string): string {
  if (!primaryType) return "Business";
  return primaryType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function extractLocation(address?: string): {
  city: string | null;
  state: string | null;
} {
  if (!address) return { city: null, state: null };
  const parts = address.split(",").map((part) => part.trim());
  const city = parts.length >= 3 ? parts.at(-3) || null : parts[1] || null;
  const stateSegment = parts.length >= 2 ? parts.at(-2) || "" : "";
  const state = stateSegment.match(/\b([A-Z]{2})\b/)?.[1] ?? null;
  return { city, state };
}

function calculateLeadScore(place: {
  website: string;
  phone: string;
  rating: number;
  reviewCount: number;
  category: string;
}): number {
  let score = 0;
  if (place.website) score += 25;
  if (place.phone) score += 20;
  if (place.rating >= 4.3) score += 20;
  if (place.reviewCount >= 25) score += 20;
  const category = place.category.toLowerCase();
  if (HIGH_VALUE_CATEGORIES.some((value) => category.includes(value))) score += 15;
  return Math.min(score, 100);
}

function normalizePlace(place: GooglePlace): ProspectSearchResult | null {
  if (!place.id) return null;
  const website = place.websiteUri ?? "";
  const phone = place.nationalPhoneNumber ?? "";
  const rating = place.rating ?? 0;
  const reviewCount = place.userRatingCount ?? 0;
  const category = inferCategory(place.primaryType);
  const address = place.formattedAddress ?? "";
  const { city, state } = extractLocation(address);

  return {
    placeId: place.id,
    businessName: place.displayName?.text ?? "Unknown Business",
    category,
    city,
    state,
    phone: phone || null,
    website: website || null,
    address: address || null,
    mapsUrl: place.googleMapsUri ?? null,
    rating: rating || null,
    reviewCount: reviewCount || null,
    leadScore: calculateLeadScore({
      website,
      phone,
      rating,
      reviewCount,
      category,
    }),
  };
}

async function fetchPlacesPage(
  query: string,
  pageToken?: string,
): Promise<PlacesResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places search is not configured.");

  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 20 };
  if (pageToken) body.pageToken = pageToken;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.websiteUri",
          "places.rating",
          "places.userRatingCount",
          "places.googleMapsUri",
          "places.businessStatus",
          "places.primaryType",
          "nextPageToken",
        ].join(","),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error("Google Places API error:", response.status, await response.text());
    throw new Error(
      response.status === 429
        ? "Google Places is temporarily rate limited. Please try again shortly."
        : "Google Places could not complete this search.",
    );
  }

  return response.json() as Promise<PlacesResponse>;
}

export async function searchGooglePlaces(
  query: string,
): Promise<ProspectSearchResult[]> {
  const places: GooglePlace[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const result = await fetchPlacesPage(query, pageToken);
    places.push(...(result.places ?? []));
    pageToken = result.nextPageToken;
    pages += 1;
    if (pageToken && pages < 3) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } while (pageToken && pages < 3);

  const unique = new Map<string, ProspectSearchResult>();
  for (const place of places) {
    if (place.businessStatus === "CLOSED_PERMANENTLY") continue;
    const normalized = normalizePlace(place);
    if (normalized) unique.set(normalized.placeId, normalized);
  }
  return Array.from(unique.values());
}
