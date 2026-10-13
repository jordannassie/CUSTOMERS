// The monthly re-read of a business's own website (MVP_SPEC 7.1: "At onboarding and monthly"). Setup read it once,
// so advice kept saying what the site lacked months after the owner fixed it. Pure: clients are passed in.
import type { SiteFacts } from "../autofill";
import type { ExtractBusiness } from "../extract";
import type { ScrapeSite } from "../firecrawl";
import { siteContact, withFooterOnce } from "../page-contact";
import { AUTOFILL_MODEL, AUTOFILL_PROMPT_VERSION } from "../prompts/business-autofill.v1";
import { keepGrounded } from "../service";

export const SITE_FACTS_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the facts are older than a month, or were never saved. */
export function siteFactsStale(fetchedAt: string | null | undefined, now: Date): boolean {
  if (!fetchedAt) return true;
  return now.getTime() - new Date(fetchedAt).getTime() > SITE_FACTS_MAX_AGE_DAYS * DAY_MS;
}

/**
 * The website's facts read again, or null when this try could not tell us more than we have (Firecrawl or the AI
 * failed): the saved facts are then kept, never replaced with nothing. A site that now turns every reader away is
 * saved as such, so advice says so rather than repeating last month's facts.
 */
export async function readSiteFacts(domain: string, clients: { scrape: ScrapeSite; extract: ExtractBusiness }): Promise<SiteFacts | null> {
  const pages = await clients.scrape(domain).catch(() => null);
  if (!pages || pages.length === 0 || pages.every((p) => p.status === "failed")) return null;
  const statuses = pages.map((p) => ({ path: p.path, status: p.status }));
  const readable = pages.filter((p) => p.status === "ok" && p.markdown);
  if (readable.length === 0) {
    return { promptVersion: AUTOFILL_PROMPT_VERSION, model: null, domain, pages: statuses, facts: null, contact: null };
  }
  let model: string = AUTOFILL_MODEL;
  const output = await clients
    .extract({ domain, pages: withFooterOnce(readable), model: AUTOFILL_MODEL, answeredBy: (m) => (model = m) })
    .catch(() => null);
  if (!output) return null;
  const facts = keepGrounded(output, readable);
  return { promptVersion: AUTOFILL_PROMPT_VERSION, model, domain, pages: statuses, facts, contact: siteContact(facts, readable) };
}
