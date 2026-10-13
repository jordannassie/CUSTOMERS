// Business auto-fill (MVP_SPEC 3.2, D-18). Clients are injected, so tests and evals run the same
// flow with fixtures. It never throws for a provider failure: the worst case is an empty form.
import { factsFromPageMeta } from "./autofill-safety";
import { ExtractError, type ExtractBusiness } from "./extract";
import type { PageResult, ScrapeSite } from "./firecrawl";
import { siteContact, withFooterOnce } from "./page-contact";
import type { PlaceCandidate, SearchPlaces } from "./places";
import {
  AUTOFILL_MODEL,
  AUTOFILL_PROMPT_VERSION,
  AUTOFILL_RETRY_MODEL,
  type AutofillOutput,
} from "./prompts/business-autofill.v1";
import { brandGuesses, pickBrandPlace, type AutofillProblem, type AutofillProvider } from "./autofill-fallback";
import type { AutofillResult, PlaceChoice } from "./schema";
import {
  EMPTY_DETAILS,
  hasAnyValue,
  industryCheck,
  isChain,
  keepGrounded,
  mergeDetails,
  needsRetry,
  NOTES,
  pickPlaceForDomain,
  toResult,
  withoutBranchFacts,
} from "./service";

export type AutofillClients = {
  scrape: ScrapeSite;
  searchPlaces: SearchPlaces;
  extract: ExtractBusiness;
};

export type AutofillRequest = { domain: string } | { name: string; city: string };

/** Facts read from the business's own site only, for business_site_facts. Never Places data (D-73). */
export type SiteFacts = {
  promptVersion: string;
  /** Null when no page could be read, so no model was asked. */
  model: string | null;
  domain: string;
  pages: { path: string; status: PageResult["status"] }[];
  /** Null when no page could be read: the pages still say whether the site blocked us (BUG-087). */
  facts: AutofillOutput | null;
  /**
   * Whether the pages show a phone number and an address, kept apart from `facts`: a chain's facts drop the branch's
   * phone and address, and advice must not then say the website shows none (BUG-138). Null when nothing was read.
   */
  contact?: { hasPhone: boolean; hasAddress: boolean } | null;
};

export type AutofillRun = {
  result: AutofillResult;
  /** The only Places value we may keep (D-73). */
  placeId: string | null;
  siteFacts: SiteFacts | null;
  /** What went wrong along the way, for the server log and provider_errors (B7). Empty on a clean run. */
  problems: AutofillProblem[];
};

type Note = (provider: AutofillProvider, message: string) => void;
const reason = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

async function search(searchPlaces: SearchPlaces, query: string, note: Note): Promise<PlaceCandidate[]> {
  try {
    return await searchPlaces(query);
  } catch (err) {
    note("google_places", `Search for "${query}" failed: ${reason(err)}`);
    return [];
  }
}

/** down is true when no AI could answer (Claude and the backup failed), not when a model's answer was unusable. */
async function tryExtract(
  clients: AutofillClients,
  args: Parameters<ExtractBusiness>[0],
  note: Note,
): Promise<{ output: AutofillOutput | null; down: boolean }> {
  try {
    return { output: await clients.extract(args), down: false };
  } catch (err) {
    note("anthropic", `Reading ${args.domain} with ${args.model} failed: ${reason(err)}`);
    return { output: null, down: !(err instanceof ExtractError && err.modelFault) };
  }
}

export async function autofill(request: AutofillRequest, clients: AutofillClients): Promise<AutofillRun> {
  if (!("domain" in request)) return autofillWithoutWebsite(request, clients);
  const { domain } = request;
  const problems: AutofillProblem[] = [];
  const note: Note = (provider, message) => problems.push({ provider, message });

  const [pages, byDomain] = await Promise.all([
    clients.scrape(domain).catch((err): PageResult[] => {
      note("firecrawl", `Reading ${domain} failed: ${reason(err)}`);
      return [];
    }),
    search(clients.searchPlaces, domain, note),
  ]);
  const chain = isChain(byDomain, domain);
  let place = chain ? null : pickPlaceForDomain(byDomain, domain);
  const readable = pages.filter((p) => p.status === "ok" && p.markdown);
  const sitePages = withFooterOnce(readable);

  let site: AutofillOutput | null = null;
  let model: string = AUTOFILL_MODEL;
  let aiDown = false;
  if (sitePages.length > 0) {
    const first = await tryExtract(clients, { domain, pages: sitePages, model: AUTOFILL_MODEL, answeredBy: (m) => (model = m) }, note);
    aiDown = first.down;
    site = first.output && keepGrounded(first.output, readable);
  }
  let contact = siteContact(site, readable);
  if (site && chain) site = withoutBranchFacts(site, byDomain);
  // No AI could read the site (D-84): its own page title and meta description stand in for the name and description.
  const fromMeta = !site && aiDown ? factsFromPageMeta(pages, domain) : null;

  // Second Places query by the name the site gives, plus its city when stated. Not for a chain: it finds a branch.
  const named = site ?? fromMeta;
  if (!place && !chain && named?.name) {
    const query = [named.name, named.city, named.state].filter(Boolean).join(" ");
    place = pickPlaceForDomain(await search(clients.searchPlaces, query, note), domain);
  }

  // The site could not be read and Google does not list it by its address: ask for the brand the domain spells (B7).
  if (!place && !chain && !site) {
    const guesses = brandGuesses(domain);
    for (const guess of guesses) {
      const found = await search(clients.searchPlaces, guess, note);
      if (isChain(found, domain)) break;
      place = pickBrandPlace(found, domain);
      if (place) break;
    }
  }

  if (site && needsRetry(site, mergeDetails(site, place))) {
    let retryModel: string = AUTOFILL_RETRY_MODEL;
    const retry = (
      await tryExtract(clients, { domain, pages: sitePages, model: AUTOFILL_RETRY_MODEL, answeredBy: (m) => (retryModel = m) }, note)
    ).output;
    if (retry) {
      site = keepGrounded(retry, readable);
      contact = siteContact(site, readable);
      if (chain) site = withoutBranchFacts(site, byDomain);
      model = retryModel;
    }
  }

  if (readable.length === 0) {
    const seen = pages.length ? pages.map((p) => `${p.path} ${p.status}`).join(", ") : "no pages came back";
    note("firecrawl", `Nothing readable on ${domain} (${seen}). ${place ? "Filled in from Google." : "No Google listing found either."}`);
  }
  const fromSite = site ?? fromMeta;
  const details = mergeDetails(fromSite, place);
  const fromWebsite = fromSite !== null && hasAnyValue(mergeDetails(fromSite, null));
  const placesDown = problems.some((p) => p.provider === "google_places");
  return {
    result: toResult({
      details,
      fromWebsite,
      fromGoogle: place !== null,
      hadWebsite: true,
      chain,
      // A provider failed, so "we couldn't find your business" would be wrong (D-84).
      aiDown: aiDown || (placesDown && !fromWebsite && place === null),
      industryCheck: industryCheck(fromSite, place),
    }),
    placeId: place?.placeId ?? null,
    // Saved even when nothing was readable, so advice can tell "blocks AI readers" from "no website" (BUG-087).
    siteFacts:
      site || (pages.length > 0 && readable.length === 0)
        ? {
            promptVersion: AUTOFILL_PROMPT_VERSION,
            model: site ? model : null,
            domain,
            pages: pages.map((p) => ({ path: p.path, status: p.status })),
            facts: site,
            contact: site ? contact : null,
          }
        : null,
    problems,
  };
}

/** How many Google listings "Is one of these your business?" offers. */
export const MAX_PLACE_CHOICES = 5;

// MVP_SPEC 3.3: no website, so no scrape and no model call. The top result by name and city can be another
// business, so nothing is adopted here: the listings come back as choices, and the form keeps what the user
// typed until they pick one. placeId stays null; the pick saves it (confirmBusinessPlace).
async function autofillWithoutWebsite(
  request: { name: string; city: string },
  clients: AutofillClients,
): Promise<AutofillRun> {
  const problems: AutofillProblem[] = [];
  const found = await search(clients.searchPlaces, `${request.name} ${request.city}`, (provider, message) => problems.push({ provider, message }));
  const choices: PlaceChoice[] = found
    .filter((place): place is PlaceCandidate & { name: string } => Boolean(place.name))
    .slice(0, MAX_PLACE_CHOICES)
    .map((place) => {
      const details = mergeDetails(null, place);
      return {
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        // A listing with no city keeps the one the user typed.
        autofill: toResult({ details: { ...details, city: details.city || request.city }, fromWebsite: false, fromGoogle: true, hadWebsite: false }),
      };
    });
  const typed = toResult({ details: { ...EMPTY_DETAILS, name: request.name, city: request.city }, fromWebsite: false, fromGoogle: false, hadWebsite: false });
  return {
    result: choices.length ? { ...typed, note: NOTES.noneChosen, choices } : typed,
    placeId: null,
    siteFacts: null,
    problems,
  };
}
