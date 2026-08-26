import type { ActionType } from "./types";

/**
 * Business-category-aware action recommendations.
 *
 * Returns the set of action types that are relevant for a given business
 * based on its industry/description. We only recommend actions that make
 * sense for the business — we never push a restaurant to add "purchase_product"
 * or a roofer to add "order_food".
 */

interface CategoryProfile {
  keywords: RegExp[];
  recommended: ActionType[];
}

const CATEGORY_PROFILES: CategoryProfile[] = [
  // Food & Beverage
  {
    keywords: [/restaurant|dining|cafe|bistro|eatery|food|pizza|burger|sushi|mexican|italian|thai|coffee|bakery|deli|bar\b|pub|brewery|winery/i],
    recommended: ["view_menu", "make_reservation", "order_food", "contact_business", "find_location"],
  },
  // Medical / Dental / Health
  {
    keywords: [/dentist|dental|orthodont|periodont|endodont|implant|teeth/i],
    recommended: ["book_appointment", "contact_business", "request_quote", "get_support"],
  },
  {
    keywords: [/doctor|physician|medical|clinic|hospital|urgent\s*care|health\s*care|healthcare|primary\s*care/i],
    recommended: ["book_appointment", "contact_business", "get_support"],
  },
  {
    keywords: [/med\s*spa|medspa|aesthetics|botox|filler|laser|skin\s*(care|treatment)|plastic\s*surgeon|cosmetic/i],
    recommended: ["book_appointment", "request_quote", "contact_business"],
  },
  {
    keywords: [/chiropract|physical\s*therapy|massage|acupuncture|wellness|mental\s*health|therapist|counselor|psycholog/i],
    recommended: ["book_appointment", "contact_business", "get_support"],
  },
  // Legal
  {
    keywords: [/law\s*firm|attorney|lawyer|legal|solicitor|counsel/i],
    recommended: ["request_quote", "contact_business", "submit_application", "book_appointment"],
  },
  // Home Services
  {
    keywords: [/roofing|roofer|roof/i],
    recommended: ["request_quote", "contact_business", "check_service_area", "book_appointment"],
  },
  {
    keywords: [/hvac|heating|cooling|air\s*condition|furnace|plumb|electric|electrician|solar|windows|siding|gutter|fence|deck|paint|landscap|lawn|pest\s*control|clean/i],
    recommended: ["request_quote", "contact_business", "check_service_area", "book_appointment"],
  },
  {
    keywords: [/contrac|remodel|renovation|construction|carpenter|handyman|home\s*improve/i],
    recommended: ["request_quote", "contact_business", "check_service_area"],
  },
  // Real Estate
  {
    keywords: [/real\s*estate|realtor|realty|home\s*(buy|sell)|property|mortgage|lending/i],
    recommended: ["contact_business", "request_quote", "find_location", "book_appointment"],
  },
  // Auto
  {
    keywords: [/auto|car\s*(repair|service)|mechanic|tire|dealership|vehicle|truck/i],
    recommended: ["book_appointment", "request_quote", "contact_business", "find_location", "check_service_area"],
  },
  // Ecommerce / Retail
  {
    keywords: [/ecommerce|e-commerce|online\s*store|shop|retail|boutique|clothe|apparel|jewelry|furniture|electronics/i],
    recommended: ["search_products", "purchase_product", "get_support", "find_location"],
  },
  // Education / Training
  {
    keywords: [/school|academy|tutor|coaching|training|course|program|education|learn/i],
    recommended: ["submit_application", "contact_business", "request_quote", "book_appointment"],
  },
  // Financial / Insurance
  {
    keywords: [/financial|finance|insurance|accounting|bookkeep|tax|wealth|invest|advisor/i],
    recommended: ["request_quote", "contact_business", "book_appointment", "submit_application"],
  },
  // Fitness / Gym / Sport
  {
    keywords: [/gym|fitness|yoga|pilates|crossfit|martial\s*arts|personal\s*train|sport/i],
    recommended: ["book_appointment", "contact_business", "view_services", "request_quote"],
  },
  // Pet
  {
    keywords: [/vet|veterinar|animal|pet|grooming|dog|cat/i],
    recommended: ["book_appointment", "contact_business", "get_support"],
  },
  // Salon / Beauty
  {
    keywords: [/salon|hair|barber|nail|wax|spa\b/i],
    recommended: ["book_appointment", "contact_business", "view_services"],
  },
  // Hospitality / Travel
  {
    keywords: [/hotel|motel|inn|resort|bed\s*and\s*breakfast|hostel|vacation\s*rent/i],
    recommended: ["make_reservation", "contact_business", "check_service_area"],
  },
  // General B2B
  {
    keywords: [/agency|consultant|marketing|advertising|pr\b|public\s*relations|design|development|software|saas|tech|IT\b|solution/i],
    recommended: ["contact_business", "request_quote", "book_appointment", "submit_application"],
  },
];

/** Fallback for unclassified businesses */
const DEFAULT_RECOMMENDED: ActionType[] = [
  "contact_business",
  "request_quote",
  "view_services",
];

/**
 * Return the recommended action types for a business based on its industry
 * and/or description. The returned list is ordered by importance.
 */
export function getRecommendedActions(
  industry: string | null,
  description: string | null,
): ActionType[] {
  const combined = [industry ?? "", description ?? ""].join(" ");
  if (!combined.trim()) return DEFAULT_RECOMMENDED;

  for (const profile of CATEGORY_PROFILES) {
    if (profile.keywords.some((re) => re.test(combined))) {
      return profile.recommended;
    }
  }
  return DEFAULT_RECOMMENDED;
}
