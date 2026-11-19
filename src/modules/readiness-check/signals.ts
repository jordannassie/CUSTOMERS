/** What we can read from a site's home page HTML. Pure: no network. */
export type Signals = {
  hasTitle: boolean;
  hasDescription: boolean;
  hasStructuredData: boolean;
  hasBusinessType: boolean;
  hasOneH1: boolean;
  hasSubheadings: boolean;
  wordCount: number;
  hasPhone: boolean;
  hasAddress: boolean;
  hasContactForm: boolean;
  hasReviews: boolean;
};

const BUSINESS_TYPES = [
  "LocalBusiness", "Restaurant", "MedicalBusiness", "LegalService",
  "HomeAndConstructionBusiness", "HealthAndBeautyBusiness", "Organization",
  "AutoRepair", "Dentist", "Plumber", "RoofingContractor", "Gym",
  "HairSalon", "Store", "FoodEstablishment", "AccountingService",
];

export function extractSignals(html: string): Signals {
  const title = (html.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1] ?? "").trim();
  const description = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})/i)?.[1] ?? ""
  ).trim();
  const types = [...html.matchAll(/"@type"\s*:\s*"([^"]{2,60})"/g)].map((m) => m[1]);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  return {
    hasTitle: title.length > 15,
    hasDescription: description.length > 60,
    hasStructuredData: types.length > 0,
    hasBusinessType: types.some((t) => BUSINESS_TYPES.some((b) => t.includes(b))),
    hasOneH1: (html.match(/<h1[\s>]/gi) ?? []).length === 1,
    hasSubheadings: (html.match(/<h2[\s>]/gi) ?? []).length >= 2,
    wordCount: text.split(" ").filter((w) => w.length > 3).length,
    hasPhone: /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(html),
    hasAddress: /itemprop=["']streetAddress["']|class=["'][^"']*address[^"']*["']|<address[\s>]/i.test(html),
    hasContactForm: /<form[\s\S]{0,2000}(contact|quote|book|inquiry|request|appointment)/i.test(html),
    hasReviews: /(review|testimonial|rating)s?/i.test(html.substring(0, 60_000)),
  };
}

/** 0 to 100. The weights are ours, not a measure of what any AI actually says. */
export function readinessScore(s: Signals): number {
  let score = 0;
  if (s.hasTitle) score += 8;
  if (s.hasDescription) score += 8;
  if (s.hasStructuredData) score += 18;
  if (s.hasBusinessType) score += 12;
  if (s.hasOneH1) score += 8;
  if (s.hasSubheadings) score += 6;
  if (s.wordCount > 400) score += 10;
  else if (s.wordCount > 150) score += 5;
  if (s.hasPhone) score += 8;
  if (s.hasAddress) score += 8;
  if (s.hasContactForm) score += 7;
  if (s.hasReviews) score += 7;
  return Math.min(100, score);
}
