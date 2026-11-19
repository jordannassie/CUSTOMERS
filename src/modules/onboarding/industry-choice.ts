// Which industry the details form starts on when Google and the website both say something (MVP_SPEC 3.2). Pure.
import { INDUSTRY_LABELS } from "@/lib/industries";
import { industryFromPlacesType, placesTypeLabel, type Industry } from "./industries";
import type { PlaceCandidate } from "./places";
import type { AutofillOutput } from "./prompts/business-autofill.v1";
import type { BusinessDetails } from "./schema";

type ChosenIndustry = Pick<BusinessDetails, "industry" | "industryText">;

// Google types that are a med spa only when the business says it does medical treatments; a plain skin care clinic
// or day spa is not. Places has no type for med spas (perfectmedspa.com is "spa").
const MED_SPA_TYPES = new Set(["medical_spa", "skin_care_clinic"]);
const MED_SPA_WORDS = /\b(botox|injectables?|fillers?|lasers?|med(ical)?[\s-]?spas?|dysport|microneedling|coolsculpt\w*|kybella)\b/i;

// Places has no HVAC type, so heating and cooling companies come in as one of these trades.
const HVAC_RIVALS = new Set(["plumber", "electrician", "general_contractor"]);
const HVAC_WORDS = /\b(heat\w*|furnaces?|boilers?|air[\s-]?condition\w*|a\/?c|hvac|cool\w*|heat pumps?|duct\w*|thermostats?|ventilation|refrigerat\w*|mini[\s-]?splits?)\b/i;

function medSpaEvidence(site: AutofillOutput | null, place: PlaceCandidate | null): boolean {
  const text = [site?.name, site?.description, ...(site?.services ?? []), place?.name].filter(Boolean).join(" ");
  return MED_SPA_WORDS.test(text);
}

// A name that says heating or air, and no other trade: "Gem Heating & Air Conditioning" (2026-10-15 eval, whose site
// gave no services). "Smith Plumbing & Heating" is a plumber.
const HVAC_NAME = /\b(heating|air[\s-]?condition\w*|hvac|cooling|furnaces?|heat pumps?)\b/i;
const OTHER_TRADE = /\b(plumb\w*|electric\w*|drains?|sewer|roof\w*|contracting|construction)\b/i;

function hvacName(site: AutofillOutput | null, place: PlaceCandidate | null): boolean {
  const name = place?.name || site?.name || "";
  return HVAC_NAME.test(name) && !OTHER_TRADE.test(name);
}

/** At least half the services are heating, cooling or air. A water heater is plumbing. */
function mostlyHvac(site: AutofillOutput | null): boolean {
  const services = site?.services ?? [];
  const hvac = services.filter((s) => HVAC_WORDS.test(s) && !/water[\s-]?heat/i.test(s));
  return services.length > 0 && hvac.length * 2 >= services.length;
}

function typeIndustry(type: string | null | undefined, medSpa: boolean): Industry | null {
  if (type && medSpa && MED_SPA_TYPES.has(type)) return "med_spa";
  return industryFromPlacesType(type);
}

/**
 * Google's type usually wins: a known one is the industry, any other specific one is "other" with Google's name for
 * it (BUG-123). The website wins instead when:
 * - one of the listing's other types maps to the website's industry (Tim Hortons: restaurant, also coffee_shop);
 * - Google says plumber, electrician or general contractor (Places has no HVAC type) and the website says HVAC with
 *   mostly heating and cooling services or such a name, or says nothing and the name is heating and cooling;
 * - Google's type is none of ours and the website names one of ours with high confidence (a med spa listed as
 *   "spa"). Not when that industry is only a side type of the listing: a bookstore that lists a cafe stays
 *   "Other: Bookstore" (BUG-123).
 */
export function chooseIndustry(site: AutofillOutput | null, place: PlaceCandidate | null): ChosenIndustry {
  const medSpa = medSpaEvidence(site, place);
  const primary = place?.primaryType ?? null;
  const google = typeIndustry(primary, medSpa);
  const listed = new Set((place?.types ?? []).map((t) => typeIndustry(t, medSpa)).filter((i): i is Industry => i !== null));
  const website = site?.industry && site.industry !== "other" ? site.industry : null;

  if (primary && HVAC_RIVALS.has(primary)) {
    // The website's HVAC answer backed by its services or its name, or a heating and cooling name the website is
    // silent about.
    const hvac = website === "hvac" ? mostlyHvac(site) || hvacName(site, place) : !website && hvacName(site, place);
    if (hvac) return { industry: "hvac" };
  }
  if (google) return { industry: website && website !== google && listed.has(website) ? website : google };

  const otherType = placesTypeLabel(primary);
  if (!otherType) return { industry: site?.industry ?? "" };
  // Google's own side types, without the med spa reading: a cafe on a bookstore's listing is a side offering.
  const side = new Set((place?.types ?? []).map((t) => industryFromPlacesType(t)));
  if (website && site?.confidence === "high" && !side.has(website)) return { industry: website };
  return { industry: "other", industryText: otherType };
}

/**
 * When Google and the website still name different kinds of business, both labels, so the details step can ask the
 * user to check: "Google says Restaurant, your website looks like Coffee shop." Null when they agree or one is silent.
 */
export function industryCheck(site: AutofillOutput | null, place: PlaceCandidate | null): { google: string; website: string } | null {
  const website = site?.industry && site.industry !== "other" ? site.industry : null;
  if (!website || !place) return null;
  const google = industryFromPlacesType(place.primaryType);
  const googleLabel = google ? INDUSTRY_LABELS[google] : placesTypeLabel(place.primaryType);
  if (!googleLabel || chooseIndustry(site, place).industry === website) return null;
  return { google: googleLabel, website: INDUSTRY_LABELS[website] };
}
