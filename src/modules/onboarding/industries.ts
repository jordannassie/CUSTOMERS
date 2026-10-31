import { type Industry } from "@/lib/industries";

export { INDUSTRIES, type Industry } from "@/lib/industries";

// Google Places primary types (Places API "Table A") that map to one of our industries. Unlisted
// types return null, so the website decides the industry instead of a wrong guess.
const PLACES_TYPES: Record<string, Industry> = {
  dentist: "dentist",
  dental_clinic: "dentist",
  lawyer: "lawyer",
  restaurant: "restaurant",
  coffee_shop: "coffee_shop",
  cafe: "coffee_shop",
  plumber: "plumber",
  real_estate_agency: "real_estate",
  car_repair: "auto_repair",
  hair_salon: "salon",
  beauty_salon: "salon",
  nail_salon: "salon",
  barber_shop: "salon",
};

export function industryFromPlacesType(primaryType: string | null | undefined): Industry | null {
  if (!primaryType) return null;
  if (PLACES_TYPES[primaryType]) return PLACES_TYPES[primaryType];
  // Places has dozens of cuisine types (italian_restaurant, sushi_restaurant...).
  if (primaryType.endsWith("_restaurant")) return "restaurant";
  return null;
}

/**
 * Every one of our industries any of the listing's types maps to. A Tim Hortons is primaryType restaurant, but its
 * types also say cafe and coffee_shop, so it is a restaurant and a coffee shop as far as Google is concerned.
 */
export function industriesFromPlacesTypes(types: readonly string[]): Set<Industry> {
  return new Set(types.map((t) => industryFromPlacesType(t)).filter((i): i is Industry => i !== null));
}

// Places types too broad to say what a business is.
const BROAD_TYPES = new Set(["establishment", "point_of_interest", "store", "food", "service", "health", "finance", "premise"]);
const TYPE_LABELS: Record<string, string> = { book_store: "Bookstore", clothing_store: "Clothing store", shoe_store: "Shoe store" };

/**
 * What Google calls a business whose type is none of our industries: "book_store" is "Bookstore". Null for a broad
 * type ("store") or one we map to an industry. Two bookstores then both come in as "Other: Bookstore", instead of
 * one as a coffee shop (its cafe, from its website) and one as "Other" with no type (BUG-123).
 */
export function placesTypeLabel(primaryType: string | null | undefined): string | null {
  if (!primaryType || BROAD_TYPES.has(primaryType) || industryFromPlacesType(primaryType)) return null;
  const label = TYPE_LABELS[primaryType] ?? primaryType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

