// The industry list used everywhere (D-62): the first 10 industries plus "other". B-32 builds the
// question library on the same values.
export const INDUSTRIES = [
  "dentist",
  "lawyer",
  "restaurant",
  "coffee_shop",
  "plumber",
  "hvac",
  "med_spa",
  "real_estate",
  "auto_repair",
  "salon",
  "other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

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
