// Reading a competitor's own website when the owner asks (B-91, Phase B). The same steps, prompt and checks as reading
// the business's own site (site-read.ts), so no new prompt: only what the pages say is kept, and each service carries
// the page it was found on and a short quote, so a wrong reading is easy to spot. Pure: the clients are passed in.
import type { ExtractBusiness } from "../extract";
import type { PageResult, ScrapeSite } from "../firecrawl";
import { siteContact } from "../page-contact";
import { AUTOFILL_PROMPT_VERSION } from "../prompts/business-autofill.v1";
import { readablePages, readFacts, readPages } from "../site-read";
import { bestQuote, siteClaims, siteWords, type SiteClaim } from "@/lib/site-claims";
import { pageSignals, siteSignals, type SiteSignals } from "./signals";

export type SiteService = { name: string; page: string | null; quote: string | null };

/** What a competitor's website says. Stored in website_facts.data, one row per domain (migration 071). */
export type CompetitorSiteFacts = {
  version: 2;
  promptVersion: string;
  model: string | null;
  domain: string;
  /** read: at least one page was read. blocked: it turned readers away. unreachable: it did not load. */
  status: "read" | "blocked" | "unreachable";
  pages: { path: string; status: PageResult["status"] }[];
  services: SiteService[];
  hasPhone: boolean | null;
  hasAddress: boolean | null;
  /** What the pages show for AI tools, and whether robots.txt lets AI crawlers in (step 1). Null when nothing was read. */
  signals: SiteSignals | null;
  /** Things questions often ask about (24/7, free estimates), with page and quote (step 2). */
  claims: SiteClaim[];
  /** Every meaning word on the pages, to see whether the site mentions what a question asks (step 2). */
  words: string[];
};

/** The AI crawlers robots.txt turns away; null when the file could not be read. */
export type ReadRobots = (domain: string) => Promise<string[] | null>;

const QUOTE_CHARS = 140;

/** The page text without markdown marks, links kept as their words. */
function plain(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>`|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];

function quoteAround(text: string, at: number, length: number): string {
  const from = Math.max(0, at - Math.floor((QUOTE_CHARS - length) / 2));
  let quote = text.slice(from, from + QUOTE_CHARS);
  if (from > 0) quote = quote.replace(/^\S*\s/, "");
  if (from + QUOTE_CHARS < text.length) quote = quote.replace(/\s\S*$/, "");
  return quote.trim();
}

/**
 * The first page that says the service, and the words around it. A page that has every main word of it counts too
 * ("catering for offices" for "office catering"). Null page: no page says it, so the service is not kept.
 */
export function evidenceFor(service: string, pages: { path: string; markdown: string }[]): { page: string | null; quote: string | null } {
  const want = service.trim().toLowerCase();
  if (!want) return { page: null, quote: null };
  // The phrase itself, with the best-reading quote across the pages (a sentence over a menu label).
  const exact = bestQuote(pages, new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  if (exact) return exact;
  const texts = pages.map((p) => ({ path: p.path, text: plain(p.markdown) }));
  const main = words(want).map((w) => w.replace(/s$/, ""));
  if (main.length === 0) return { page: null, quote: null };
  for (const p of texts) {
    const lower = p.text.toLowerCase();
    if (main.every((w) => lower.includes(w))) return { page: p.path, quote: quoteAround(p.text, lower.indexOf(main[0]), main[0].length) };
  }
  return { page: null, quote: null };
}

/**
 * The site read again, or null when this try could not tell us anything (Firecrawl or the AI failed), so nothing is
 * saved and the owner can try later. A site that turns every reader away is saved as such.
 */
export async function readCompetitorSite(
  domain: string,
  clients: { scrape: ScrapeSite; extract: ExtractBusiness; robots?: ReadRobots },
): Promise<CompetitorSiteFacts | null> {
  const [pages, blocked] = await Promise.all([readPages(clients.scrape, domain), (clients.robots?.(domain) ?? Promise.resolve(null)).catch(() => null)]);
  if (pages.length === 0 || pages.every((p) => p.status === "failed")) return null;
  const statuses = pages.map((p) => ({ path: p.path, status: p.status }));
  const readable = readablePages(pages);
  const base = { version: 2 as const, promptVersion: AUTOFILL_PROMPT_VERSION, domain, pages: statuses };
  if (readable.length === 0) {
    const status = pages.some((p) => p.status === "blocked") ? "blocked" : "unreachable";
    return { ...base, model: null, status, services: [], hasPhone: null, hasAddress: null, signals: null, claims: [], words: [] };
  }
  const { facts, model } = await readFacts(clients.extract, domain, readable);
  if (!facts) return null;
  const contact = siteContact(facts, readable);
  return {
    ...base,
    model,
    status: "read",
    // Only services a page actually says: a claim like "their website lists catering" must be checkable.
    services: facts.services.map((name) => ({ name, ...evidenceFor(name, readable) })).filter((s) => s.page !== null),
    hasPhone: contact?.hasPhone ?? null,
    hasAddress: contact?.hasAddress ?? null,
    signals: siteSignals(
      readable.map((p) => ({ markdown: p.markdown, signals: p.signals ?? pageSignals(null, p.markdown) })),
      blocked,
    ),
    claims: siteClaims(readable),
    words: siteWords(readable),
  };
}
