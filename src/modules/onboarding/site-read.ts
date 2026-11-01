// Reading a business's own website: its pages, then the facts the model finds in them, kept only where the text
// backs them. Auto-fill at setup and the monthly re-read (site-refresh) share these steps, so the two can never read
// a site differently (2026-10-14). Pure: the clients are passed in.
import { ExtractError, type AutofillModel, type ExtractBusiness } from "./extract";
import type { PageResult, ScrapeSite } from "./firecrawl";
import { withFooterOnce } from "./page-contact";
import { AUTOFILL_MODEL, type AutofillOutput } from "./prompts/business-autofill.v1";
import { keepGrounded } from "./service";

/** Told why a step failed, for the provider problem log; the read itself never throws. */
export type OnReadError = (message: string) => void;

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/** The site's pages; none when Firecrawl could not be reached. */
export async function readPages(scrape: ScrapeSite, domain: string, onError?: OnReadError): Promise<PageResult[]> {
  try {
    return await scrape(domain);
  } catch (err) {
    onError?.(`Reading ${domain} failed: ${reason(err)}`);
    return [];
  }
}

/** The pages with text the model can read. */
export function readablePages(pages: PageResult[]): PageResult[] {
  return pages.filter((p) => p.status === "ok" && p.markdown);
}

export type ReadFacts = {
  /** What the model found, each name, city, address and phone kept only when the pages say it; null on failure. */
  facts: AutofillOutput | null;
  /** The model that answered (the OpenAI backup when Claude failed, D-84). */
  model: string;
  /** No AI could answer (Claude and the backup failed), not a model answer that was unusable. */
  down: boolean;
};

export async function readFacts(
  extract: ExtractBusiness,
  domain: string,
  readable: PageResult[],
  options: { model?: AutofillModel; onError?: OnReadError } = {},
): Promise<ReadFacts> {
  const asked = options.model ?? AUTOFILL_MODEL;
  let model: string = asked;
  if (readable.length === 0) return { facts: null, model, down: false };
  try {
    const output = await extract({ domain, pages: withFooterOnce(readable), model: asked, answeredBy: (m) => (model = m) });
    return { facts: keepGrounded(output, readable), model, down: false };
  } catch (err) {
    options.onError?.(`Reading ${domain} with ${model} failed: ${reason(err)}`);
    return { facts: null, model, down: !(err instanceof ExtractError && err.modelFault) };
  }
}
