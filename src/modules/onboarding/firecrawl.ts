import "server-only";
// Firecrawl scrape of the business's own pages as markdown, main content only (MVP_SPEC 3.2).
// The API key is passed in; only a dal.ts reads secrets.
import { z } from "zod";
import { postJson, SOURCE_TIMEOUT_MS, type HttpDeps } from "./http";

export const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
export const SITE_PATHS = ["/", "/about", "/about-us", "/contact"] as const;

/** "missing": the page does not exist (most sites have only some of the four paths). */
export type PageStatus = "ok" | "blocked" | "missing" | "failed";

export type PageResult = {
  path: string;
  status: PageStatus;
  markdown: string;
  title: string | null;
};

export type ScrapeSite = (domain: string) => Promise<PageResult[]>;

const scrapeResponse = z.object({
  success: z.boolean(),
  data: z
    .object({
      markdown: z.string().nullish(),
      metadata: z
        .object({
          title: z.union([z.string(), z.array(z.string())]).nullish(),
          statusCode: z.number().nullish(),
        })
        .loose()
        .nullish(),
    })
    .nullish(),
});

// Bot-check pages come back as a normal scrape with the challenge text as content.
const CHALLENGE =
  /just a moment\.\.\.|attention required! \| cloudflare|checking your browser before accessing|verify you are human|enable javascript and cookies to continue|access denied/i;

export function createFirecrawlScraper(apiKey: string, deps: HttpDeps = {}): ScrapeSite {
  const scrapePage = async (domain: string, path: string): Promise<PageResult> => {
    const empty = { path, markdown: "", title: null };
    try {
      const { status, body } = await postJson(
        FIRECRAWL_SCRAPE_URL,
        { Authorization: `Bearer ${apiKey}` },
        {
          url: `https://${domain}${path}`,
          formats: ["markdown"],
          onlyMainContent: true,
          // Firecrawl stops a little before our own timeout, so its error reaches us.
          timeout: (deps.timeoutMs ?? SOURCE_TIMEOUT_MS) - 5_000,
        },
        deps,
      );
      if (status === 403) return { ...empty, status: "blocked" };
      if (status < 200 || status >= 300) return { ...empty, status: "failed" };
      return toPage(path, body);
    } catch {
      return { ...empty, status: "failed" };
    }
  };

  return (domain) => Promise.all(SITE_PATHS.map((path) => scrapePage(domain, path)));
}

export function toPage(path: string, body: unknown): PageResult {
  const parsed = scrapeResponse.safeParse(body);
  if (!parsed.success || !parsed.data.success || !parsed.data.data) {
    return { path, status: "failed", markdown: "", title: null };
  }
  const markdown = (parsed.data.data.markdown ?? "").trim();
  const rawTitle = parsed.data.data.metadata?.title;
  const title = (Array.isArray(rawTitle) ? rawTitle[0] : rawTitle)?.trim() || null;
  const statusCode = parsed.data.data.metadata?.statusCode ?? 200;

  if (statusCode === 404 || statusCode === 410) return { path, status: "missing", markdown: "", title };
  if (statusCode === 401 || statusCode === 403 || statusCode === 429 || statusCode === 503) {
    return { path, status: "blocked", markdown: "", title };
  }
  // Challenge pages are short; a long real page may mention "access denied" in passing.
  if (CHALLENGE.test(title ?? "") || (markdown.length < 1_500 && CHALLENGE.test(markdown))) {
    return { path, status: "blocked", markdown: "", title: null };
  }
  if (statusCode >= 400) return { path, status: "failed", markdown: "", title };
  return { path, status: "ok", markdown, title };
}
