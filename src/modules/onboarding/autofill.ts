// Business auto-fill (MVP_SPEC 3.2, D-18). Clients are injected, so tests and evals run the same
// flow with fixtures. It never throws for a provider failure: the worst case is an empty form.
import type { ExtractBusiness } from "./extract";
import type { PageResult, ScrapeSite } from "./firecrawl";
import type { PlaceCandidate, SearchPlaces } from "./places";
import {
  AUTOFILL_MODEL,
  AUTOFILL_PROMPT_VERSION,
  AUTOFILL_RETRY_MODEL,
  type AutofillOutput,
} from "./prompts/business-autofill.v1";
import type { AutofillResult } from "./schema";
import { EMPTY_DETAILS, hasAnyValue, keepGrounded, mergeDetails, needsRetry, pickPlaceForDomain, toResult } from "./service";

export type AutofillClients = {
  scrape: ScrapeSite;
  searchPlaces: SearchPlaces;
  extract: ExtractBusiness;
};

export type AutofillRequest = { domain: string } | { name: string; city: string };

/** Facts read from the business's own site only, for business_site_facts. Never Places data (D-73). */
export type SiteFacts = {
  promptVersion: string;
  model: string;
  domain: string;
  pages: { path: string; status: PageResult["status"] }[];
  facts: AutofillOutput;
};

export type AutofillRun = {
  result: AutofillResult;
  /** The only Places value we may keep (D-73). */
  placeId: string | null;
  siteFacts: SiteFacts | null;
};

async function search(searchPlaces: SearchPlaces, query: string): Promise<PlaceCandidate[]> {
  try {
    return await searchPlaces(query);
  } catch {
    return [];
  }
}

async function tryExtract(clients: AutofillClients, args: Parameters<ExtractBusiness>[0]) {
  try {
    return await clients.extract(args);
  } catch {
    return null;
  }
}

export async function autofill(request: AutofillRequest, clients: AutofillClients): Promise<AutofillRun> {
  if (!("domain" in request)) return autofillWithoutWebsite(request, clients);
  const { domain } = request;

  const [pages, byDomain] = await Promise.all([
    clients.scrape(domain).catch((): PageResult[] => []),
    search(clients.searchPlaces, domain),
  ]);
  let place = pickPlaceForDomain(byDomain, domain);
  const readable = pages.filter((p) => p.status === "ok" && p.markdown);
  const sitePages = readable.map((p) => ({ path: p.path, markdown: p.markdown }));

  let site: AutofillOutput | null = null;
  let model: string = AUTOFILL_MODEL;
  if (sitePages.length > 0) {
    const first = await tryExtract(clients, { domain, pages: sitePages, model: AUTOFILL_MODEL });
    site = first && keepGrounded(first, readable);
  }

  // Second Places query by the name the site gives, plus its city when stated.
  if (!place && site?.name) {
    const query = [site.name, site.city, site.state].filter(Boolean).join(" ");
    place = pickPlaceForDomain(await search(clients.searchPlaces, query), domain);
  }

  if (site && needsRetry(site, mergeDetails(site, place))) {
    const retry = await tryExtract(clients, { domain, pages: sitePages, model: AUTOFILL_RETRY_MODEL });
    if (retry) {
      site = keepGrounded(retry, readable);
      model = AUTOFILL_RETRY_MODEL;
    }
  }

  const details = mergeDetails(site, place);
  return {
    result: toResult({ details, fromWebsite: site !== null && hasAnyValue(mergeDetails(site, null)), fromGoogle: place !== null, hadWebsite: true }),
    placeId: place?.placeId ?? null,
    siteFacts: site
      ? {
          promptVersion: AUTOFILL_PROMPT_VERSION,
          model,
          domain,
          pages: pages.map((p) => ({ path: p.path, status: p.status })),
          facts: site,
        }
      : null,
  };
}

// MVP_SPEC 3.3: no website, so no scrape and no model call. The top Places result pre-fills the
// form and the user confirms it; with no result the form keeps what they typed.
async function autofillWithoutWebsite(
  request: { name: string; city: string },
  clients: AutofillClients,
): Promise<AutofillRun> {
  const [place] = await search(clients.searchPlaces, `${request.name} ${request.city}`);
  const details = place
    ? mergeDetails(null, place)
    : { ...EMPTY_DETAILS, name: request.name, city: request.city };
  return {
    result: toResult({ details, fromWebsite: false, fromGoogle: Boolean(place), hadWebsite: false }),
    placeId: place?.placeId ?? null,
    siteFacts: null,
  };
}
