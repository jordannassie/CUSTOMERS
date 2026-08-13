import "server-only";

import type {
  ProspectBusinessHours,
  ProspectSearchDepth,
  ProspectSearchMetadata,
  ProspectSearchResult,
} from "@/types/prospecting";

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
  location?: LatLng;
  viewport?: Viewport;
}

interface PlacesResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

interface Viewport {
  low: LatLng;
  high: LatLng;
}

interface SearchAreaResult {
  places: GooglePlace[];
  saturated: boolean;
}

export interface GooglePlacesSearchResult {
  businesses: ProspectSearchResult[];
  metadata: ProspectSearchMetadata;
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

async function googlePlacesRequest<T>(
  body: Record<string, unknown>,
  fieldMask: string,
): Promise<T> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places search is not configured.");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    if (response.ok) return response.json() as Promise<T>;
    const retryable = response.status === 429 || response.status >= 500;
    console.error("Google Places API error:", response.status, await response.text());
    if (retryable && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      continue;
    }
    throw new Error(
      response.status === 429
        ? "Google Places is temporarily rate limited. Please try again shortly."
        : "Google Places could not complete this search.",
    );
  }
  throw new Error("Google Places could not complete this search.");
}

async function fetchPlacesPage(
  query: string,
  pageToken?: string,
  restriction?: Viewport,
): Promise<PlacesResponse> {
  const body: Record<string, unknown> = { textQuery: query, pageSize: 20 };
  if (pageToken) body.pageToken = pageToken;
  if (restriction) {
    body.locationRestriction = { rectangle: restriction };
  }
  return googlePlacesRequest<PlacesResponse>(
    body,
    [
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
  );
}

async function searchArea(
  query: string,
  restriction?: Viewport,
): Promise<SearchAreaResult> {
  const places: GooglePlace[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const result = await fetchPlacesPage(query, pageToken, restriction);
    places.push(...(result.places ?? []));
    pageToken = result.nextPageToken;
    pages += 1;
    if (pageToken && pages < 3) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } while (pageToken && pages < 3);

  return { places, saturated: places.length >= 55 };
}

function parseCategoryAndLocation(query: string): {
  category: string;
  location: string;
} | null {
  const match = query.match(/^(.+?)\s+in\s+(.+)$/i);
  if (!match?.[1] || !match[2]) return null;
  return { category: match[1].trim(), location: match[2].trim() };
}

function validViewport(viewport?: Viewport): viewport is Viewport {
  if (!viewport) return false;
  const { low, high } = viewport;
  return (
    Number.isFinite(low.latitude) &&
    Number.isFinite(low.longitude) &&
    Number.isFinite(high.latitude) &&
    Number.isFinite(high.longitude) &&
    high.latitude > low.latitude &&
    high.longitude > low.longitude &&
    high.latitude - low.latitude <= 4 &&
    high.longitude - low.longitude <= 4
  );
}

async function resolveSearchViewport(location: string): Promise<Viewport | null> {
  const response = await googlePlacesRequest<PlacesResponse>(
    {
      textQuery: location,
      pageSize: 1,
      includedType: "locality",
      strictTypeFiltering: true,
    },
    "places.viewport,places.location",
  );
  const place = response.places?.[0];
  if (validViewport(place?.viewport)) return place.viewport;
  if (!place?.location) return null;
  const { latitude, longitude } = place.location;
  return {
    low: { latitude: latitude - 0.25, longitude: longitude - 0.25 },
    high: { latitude: latitude + 0.25, longitude: longitude + 0.25 },
  };
}

function splitViewport(viewport: Viewport): Viewport[] {
  const middleLatitude = (viewport.low.latitude + viewport.high.latitude) / 2;
  const middleLongitude = (viewport.low.longitude + viewport.high.longitude) / 2;
  return [
    {
      low: viewport.low,
      high: { latitude: middleLatitude, longitude: middleLongitude },
    },
    {
      low: { latitude: viewport.low.latitude, longitude: middleLongitude },
      high: { latitude: middleLatitude, longitude: viewport.high.longitude },
    },
    {
      low: { latitude: middleLatitude, longitude: viewport.low.longitude },
      high: { latitude: viewport.high.latitude, longitude: middleLongitude },
    },
    {
      low: { latitude: middleLatitude, longitude: middleLongitude },
      high: viewport.high,
    },
  ];
}

function normalizeUniquePlaces(places: GooglePlace[]): ProspectSearchResult[] {
  const unique = new Map<string, ProspectSearchResult>();
  for (const place of places) {
    if (place.businessStatus === "CLOSED_PERMANENTLY") continue;
    const normalized = normalizePlace(place);
    if (normalized) unique.set(normalized.placeId, normalized);
  }
  return Array.from(unique.values());
}

export async function searchGooglePlaces(
  query: string,
  depth: ProspectSearchDepth,
): Promise<GooglePlacesSearchResult> {
  const parsed = parseCategoryAndLocation(query);
  if (depth === "quick" || !parsed) {
    const result = await searchArea(query);
    return {
      businesses: normalizeUniquePlaces(result.places),
      metadata: {
        depth,
        areasSearched: 1,
        location: parsed?.location ?? null,
        expanded: false,
      },
    };
  }

  const viewport = await resolveSearchViewport(parsed.location);
  if (!viewport) {
    const result = await searchArea(query);
    return {
      businesses: normalizeUniquePlaces(result.places),
      metadata: {
        depth,
        areasSearched: 1,
        location: parsed.location,
        expanded: false,
      },
    };
  }

  const allPlaces: GooglePlace[] = [];
  let areasSearched = 0;

  if (depth === "standard") {
    const areas = splitViewport(viewport);
    for (let index = 0; index < areas.length; index += 3) {
      const results = await Promise.all(
        areas.slice(index, index + 3).map((area) => searchArea(parsed.category, area)),
      );
      for (const result of results) allPlaces.push(...result.places);
      areasSearched += results.length;
    }
  } else {
    const queue: Array<{ viewport: Viewport; level: number }> = [
      { viewport, level: 0 },
    ];
    const maxAreas = 21;
    while (queue.length > 0 && areasSearched < maxAreas) {
      const batch = queue.splice(0, Math.min(3, maxAreas - areasSearched));
      const results = await Promise.all(
        batch.map((item) => searchArea(parsed.category, item.viewport)),
      );
      areasSearched += results.length;
      results.forEach((result, index) => {
        allPlaces.push(...result.places);
        const source = batch[index];
        if (result.saturated && source.level < 2) {
          for (const child of splitViewport(source.viewport)) {
            if (queue.length + areasSearched < maxAreas) {
              queue.push({ viewport: child, level: source.level + 1 });
            }
          }
        }
      });
    }
  }

  return {
    businesses: normalizeUniquePlaces(allPlaces),
    metadata: {
      depth,
      areasSearched,
      location: parsed.location,
      expanded: true,
    },
  };
}

interface PlaceHoursResponse {
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  currentOpeningHours?: {
    openNow?: boolean;
  };
}

export async function getGooglePlaceHours(
  placeId: string,
): Promise<ProspectBusinessHours> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places search is not configured.");

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "regularOpeningHours.weekdayDescriptions,currentOpeningHours.openNow",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    console.error("Google Place hours error:", response.status, await response.text());
    throw new Error("Business hours are temporarily unavailable.");
  }

  const place = (await response.json()) as PlaceHoursResponse;
  return {
    openNow:
      typeof place.currentOpeningHours?.openNow === "boolean"
        ? place.currentOpeningHours.openNow
        : null,
    weekdayDescriptions:
      place.regularOpeningHours?.weekdayDescriptions ?? [],
  };
}
