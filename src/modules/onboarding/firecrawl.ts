import "server-only";
// Firecrawl scrape of the business's own pages as markdown, main content only (MVP_SPEC 3.2), plus the footer from
// the raw HTML of the same request, since main content leaves out the footer's phone and address (BUG-138). Up to 5
// pages: the home and about pages at once, then the services page the home page links to, or its first menu links,
// then the contact page (site-pages.ts).
// The API key is passed in; only a dal.ts reads secrets.
import { z } from "zod";
import { postJson, SOURCE_TIMEOUT_MS, type HttpDeps } from "./http";
import { footerText } from "./page-contact";
import { FIRST_PAGES, followPages, type FollowPage, type PageKind } from "./site-pages";

export const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

/** "missing": the page does not exist (most sites have only some of the four paths). */
export type PageStatus = "ok" | "blocked" | "missing" | "failed";

export type PageResult = {
  path: string;
  status: PageStatus;
  markdown: string;
  title: string | null;
  /** The page's meta description, for auto-fill's no-AI safety net (D-84). */
  description?: string | null;
  /** The footer's text, which the main-content markdown leaves out (BUG-138). */
  footer?: string;
  /** A services, menu or products page, or one of the main menu's links (site-pages.ts). */
  kind?: PageKind;
  /** On the home page: the pages to read next, from its links. */
  follow?: FollowPage[];
};

export type ScrapeSite = (domain: string) => Promise<PageResult[]>;

const scrapeResponse = z.object({
  success: z.boolean(),
  data: z
    .object({
      markdown: z.string().nullish(),
      rawHtml: z.string().nullish(),
      metadata: z
        .object({
          title: z.union([z.string(), z.array(z.string())]).nullish(),
          description: z.union([z.string(), z.array(z.string())]).nullish(),
          ogDescription: z.union([z.string(), z.array(z.string())]).nullish(),
          statusCode: z.number().nullish(),
        })
        .loose()
        .nullish(),
    })
    .nullish(),
});

// Bot-check pages come back as a normal scrape with the challenge text as content.
const CHALLENGE =
  /please wait\.{0,3}$|just a moment\.\.\.|attention required! \| cloudflare|checking your browser before accessing|verify you are human|enable javascript and cookies to continue|access denied/i;

const MIN_PAGE_CHARS = 40;
// Less time than this left once the home page is back: only the first pages are read.
const MIN_NEXT_PAGE_MS = 8_000;

export function createFirecrawlScraper(apiKey: string, deps: HttpDeps = {}): ScrapeSite {
  const budget = deps.timeoutMs ?? SOURCE_TIMEOUT_MS;
  const scrapePage = async (domain: string, { path, kind }: FollowPage, timeoutMs = budget): Promise<PageResult> => {
    const empty = { path, markdown: "", title: null, ...(kind ? { kind } : {}) };
    try {
      const { status, body } = await postJson(
        FIRECRAWL_SCRAPE_URL,
        { Authorization: `Bearer ${apiKey}` },
        {
          url: `https://${domain}${path}`,
          formats: ["markdown", "rawHtml"],
          onlyMainContent: true,
          // Firecrawl stops a little before our own timeout, so its error reaches us.
          timeout: timeoutMs - 5_000,
        },
        { ...deps, timeoutMs },
      );
      if (status === 403) return { ...empty, status: "blocked" };
      if (status < 200 || status >= 300) return { ...empty, status: "failed" };
      const page = toPage(path, body, path === "/" ? domain : undefined);
      return kind ? { ...page, kind } : page;
    } catch {
      return { ...empty, status: "failed" };
    }
  };

  return async (domain) => {
    const started = Date.now();
    const first = FIRST_PAGES.map((path) => scrapePage(domain, { path }));
    // The next pages start once the home page is back, while the about page may still load, and share the same time
    // limit, so a slow site never makes auto-fill wait twice as long.
    const next = first[0].then((home) => {
      const left = budget - (Date.now() - started);
      if (left < MIN_NEXT_PAGE_MS) return [];
      return Promise.all((home.follow ?? followPages(null, domain)).map((page) => scrapePage(domain, page, left)));
    });
    return [...(await Promise.all(first)), ...(await next)];
  };
}

/** `domain`: given for the home page, to pick the pages to read next from its links. */
export function toPage(path: string, body: unknown, domain?: string): PageResult {
  const parsed = scrapeResponse.safeParse(body);
  if (!parsed.success || !parsed.data.success || !parsed.data.data) {
    return { path, status: "failed", markdown: "", title: null };
  }
  const markdown = (parsed.data.data.markdown ?? "").trim();
  const rawTitle = parsed.data.data.metadata?.title;
  const title = (Array.isArray(rawTitle) ? rawTitle[0] : rawTitle)?.trim() || null;
  const meta = parsed.data.data.metadata;
  const rawDescription = meta?.description ?? meta?.ogDescription;
  const description = (Array.isArray(rawDescription) ? rawDescription[0] : rawDescription)?.trim() || null;
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
  const footer = footerText(parsed.data.data.rawHtml);
  const follow = domain ? { follow: followPages(parsed.data.data.rawHtml, domain) } : {};
  // Next to no text and no footer: nothing was really read, so advice must not say what the site lacks (BUG-138).
  if (markdown.length < MIN_PAGE_CHARS && !footer) return { path, status: "failed", markdown: "", title };
  return { path, status: "ok", markdown, title, description, footer, ...follow };
}
