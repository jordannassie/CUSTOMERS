// The industry list used everywhere (D-62): the first 10 industries plus "other". The onboarding form,
// the auto-fill prompt and the question library all read it from here.
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

// "other" has no library: Claude writes those businesses' questions directly (MVP_SPEC 5.3).
export type LibraryIndustry = Exclude<Industry, "other">;

export const LIBRARY_INDUSTRIES = INDUSTRIES.filter((i): i is LibraryIndustry => i !== "other");

export const INDUSTRY_LABELS: Record<Industry, string> = {
  dentist: "Dentist",
  lawyer: "Lawyer",
  restaurant: "Restaurant",
  coffee_shop: "Coffee shop",
  plumber: "Plumber",
  hvac: "HVAC (heating and air conditioning)",
  med_spa: "Med spa",
  real_estate: "Real estate agent",
  auto_repair: "Auto repair shop",
  salon: "Hair or beauty salon",
  other: "Other",
};

export function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}

// The Services field's placeholder, by industry (BUG-091). Before, every business saw plumbing examples.
const SERVICE_EXAMPLES: Record<LibraryIndustry, string> = {
  dentist: "Cleanings, teeth whitening, implants",
  lawyer: "Personal injury, family law, wills",
  restaurant: "Dine-in, takeout, catering",
  coffee_shop: "Espresso drinks, pastries, breakfast",
  plumber: "Emergency repairs, drain cleaning",
  hvac: "AC repair, furnace installation, maintenance",
  med_spa: "Botox, facials, laser hair removal",
  real_estate: "Home buying, selling, rentals",
  auto_repair: "Oil changes, brakes, diagnostics",
  salon: "Haircuts, color, blowouts",
};

export function servicesPlaceholder(industry: string): string {
  return SERVICE_EXAMPLES[industry as LibraryIndustry] ?? "Your main services, separated by commas";
}
