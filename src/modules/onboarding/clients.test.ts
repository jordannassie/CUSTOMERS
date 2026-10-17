// The three provider clients against hand-built responses; fetch is mocked, nothing goes out.
import { describe, expect, it, vi } from "vitest";
import { ANTHROPIC_CREDIT_ERROR, anthropicMessage, fakeAiClients, openaiResponse, providerFetch } from "@/modules/ai";
import { createBusinessExtractor, ExtractError } from "./extract";
import { createFirecrawlScraper, FIRECRAWL_SCRAPE_URL, toPage } from "./firecrawl";
import { COFFEE_SITE_OUTPUT } from "./fixtures";
import { createPlaceLookup, createPlacesSearch, PLACES_FIELD_MASK, PLACES_TEXT_SEARCH_URL, PlacesError, toCandidates } from "./places";
import { AUTOFILL_SYSTEM } from "./prompts/business-autofill.v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const scrape = (markdown: string, metadata: Record<string, unknown> = {}) => ({
  success: true,
  data: { markdown, metadata: { title: "Home", statusCode: 200, ...metadata } },
});

describe("Firecrawl scraper", () => {
  it("asks for the pages as main-content markdown, with the raw HTML for the footer", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(scrape("# Sunrise Coffee\n\nRoasted in house every morning.")));
    const pages = await createFirecrawlScraper("fc-test", { fetch })("sunrise-coffee.example");

    // A home page with no links: the home and about pages, then the contact and about-us addresses as before.
    expect(pages.map((p) => [p.path, p.status])).toEqual([["/", "ok"], ["/about", "ok"], ["/contact", "ok"], ["/about-us", "ok"]]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(FIRECRAWL_SCRAPE_URL);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fc-test");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      url: "https://sunrise-coffee.example/",
      formats: ["markdown", "rawHtml"],
      onlyMainContent: true,
    });
  });

  it("marks Cloudflare challenges and 403s as blocked, 404s as missing and network errors as failed", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(scrape("Checking your browser...", { title: "Just a moment..." })))
      .mockResolvedValueOnce(json({ success: false, error: "This website is not supported" }, 403))
      .mockResolvedValueOnce(json(scrape("", { statusCode: 404 })))
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    const pages = await createFirecrawlScraper("fc-test", { fetch })("brandastic-like.example");
    expect(pages.map((p) => p.status)).toEqual(["blocked", "blocked", "missing", "failed"]);
    expect(pages.every((p) => p.markdown === "")).toBe(true);
  });

  // A site's pages by address; the home page links to the given paths in its menu.
  const site = (homeLinks: string[], missing: string[] = []) =>
    vi.fn<typeof globalThis.fetch>(async (_url, init) => {
      const path = new URL(JSON.parse(String(init?.body)).url as string).pathname.replace(/\/$/, "") || "/";
      if (missing.includes(path)) return json(scrape("", { statusCode: 404 }));
      const page = scrape(`# Page ${path}\n\nWhat we say on ${path}.`);
      const rawHtml = `<header><nav>${homeLinks.map((l) => `<a href="${l}">${l.slice(1)}</a>`).join("")}</nav></header><footer>Call (512) 555-0100</footer>`;
      return json(path === "/" ? { ...page, data: { ...page.data, rawHtml } } : page);
    });
  const asked = (fetch: ReturnType<typeof site>) => fetch.mock.calls.map(([, init]) => new URL(JSON.parse(String(init?.body)).url).pathname);

  it("reads the services page the home page links to, marked for the model, 5 pages at most", async () => {
    const fetch = site(["/about", "/team", "/services", "/blog", "/contact"]);
    const pages = await createFirecrawlScraper("fc-test", { fetch })("magic-plumbing.example");
    expect(pages.map((p) => [p.path, p.kind ?? null])).toEqual([["/", null], ["/about", null], ["/services", "services"], ["/contact", null], ["/about-us", null]]);
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("reads the first 3 links of the main menu when there is no services page", async () => {
    const fetch = site(["/about", "/cart", "/plumbing", "/drains", "/water-heaters", "/reviews"]);
    const pages = await createFirecrawlScraper("fc-test", { fetch })("menu-only.example");
    expect(pages.map((p) => [p.path, p.kind ?? null])).toEqual([["/", null], ["/about", null], ["/plumbing", "menu"], ["/drains", "menu"], ["/water-heaters", "menu"]]);
    expect(asked(fetch)).not.toContain("/cart");
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("carries on when pages are missing or the home page cannot be read", async () => {
    const missing = site(["/menu"], ["/menu", "/about", "/contact"]);
    const pages = await createFirecrawlScraper("fc-test", { fetch: missing })("small-cafe.example");
    expect(pages.map((p) => [p.path, p.status])).toEqual([["/", "ok"], ["/about", "missing"], ["/menu", "missing"], ["/contact", "missing"], ["/about-us", "ok"]]);

    const down = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("fetch failed"));
    const none = await createFirecrawlScraper("fc-test", { fetch: down })("down.example");
    expect(none.map((p) => [p.path, p.status])).toEqual([["/", "failed"], ["/about", "failed"], ["/contact", "failed"], ["/about-us", "failed"]]);
  });

  it("does not call a long page blocked just because it mentions access denied", () => {
    const long = `Our clinic. ${"We treat patients kindly. ".repeat(80)} Access denied claims are handled by insurance.`;
    expect(toPage("/", scrape(long)).status).toBe("ok");
    expect(toPage("/", scrape("Access denied")).status).toBe("blocked");
    expect(toPage("/", { nope: true }).status).toBe("failed");
  });
});

describe("Places Text Search", () => {
  const place = {
    id: "ChIJ-fixture",
    displayName: { text: "Sunrise Coffee Bar", languageCode: "en" },
    formattedAddress: "120 Main St, Springfield, IL 62701, USA",
    addressComponents: [
      { longText: "Downtown", shortText: "Downtown", types: ["neighborhood", "political"] },
      { longText: "Springfield", shortText: "Springfield", types: ["locality", "political"] },
      { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1", "political"] },
      { longText: "United States", shortText: "US", types: ["country", "political"] },
    ],
    primaryType: "coffee_shop",
    types: ["coffee_shop", "cafe", "food", "establishment"],
    nationalPhoneNumber: "(217) 555-0142",
    websiteUri: "https://sunrise-coffee.example/",
  };

  it("sends the field mask and returns the fields the form uses", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ places: [place] }));
    const [found] = await createPlacesSearch("gp-test", { fetch })("sunrise-coffee.example");

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(PLACES_TEXT_SEARCH_URL);
    const headers = new Headers(init?.headers);
    expect(headers.get("x-goog-api-key")).toBe("gp-test");
    expect(headers.get("x-goog-fieldmask")).toBe(PLACES_FIELD_MASK);
    expect(PLACES_FIELD_MASK).not.toMatch(/rating|reviews|\*/);
    expect(PLACES_FIELD_MASK).toContain("places.types");
    expect(JSON.parse(String(init?.body))).toEqual({ textQuery: "sunrise-coffee.example", pageSize: 5 });
    expect(found).toEqual({
      placeId: "ChIJ-fixture",
      name: "Sunrise Coffee Bar",
      address: "120 Main St, Springfield, IL 62701, USA",
      phone: "(217) 555-0142",
      primaryType: "coffee_shop",
      types: ["coffee_shop", "cafe", "food", "establishment"],
      websiteUri: "https://sunrise-coffee.example/",
      city: "Springfield",
      state: "IL",
      country: "US",
      area: "Downtown",
    });
  });

  it("takes the area from the neighborhood, else the sublocality, else none (form pre-fill only)", () => {
    const withParts = (...parts: { longText: string; types: string[] }[]) =>
      toCandidates({ places: [{ ...place, addressComponents: [...parts, ...place.addressComponents.slice(1)] }] })[0];
    const sub = { longText: "Brooklyn", types: ["sublocality_level_1", "sublocality", "political"] };
    expect(withParts({ longText: "Williamsburg", types: ["neighborhood", "political"] }, sub).area).toBe("Williamsburg");
    expect(withParts(sub).area).toBe("Brooklyn");
    expect(withParts({ longText: "Hyde Park", types: ["sublocality", "political"] }).area).toBe("Hyde Park");
    expect(withParts().area).toBeNull();
  });

  it("returns an empty list for no match and throws on an error status", async () => {
    const empty = vi.fn<typeof globalThis.fetch>(async () => json({}));
    expect(await createPlacesSearch("gp-test", { fetch: empty })("nothing")).toEqual([]);
    const denied = vi.fn<typeof globalThis.fetch>(async () => json({ error: { status: "PERMISSION_DENIED" } }, 403));
    await expect(createPlacesSearch("gp-test", { fetch: denied })("x")).rejects.toThrow(PlacesError);
  });
});

describe("Claude extractor", () => {
  const message = (text: string, extra: Record<string, unknown> = {}) => anthropicMessage(text, extra);
  const input = {
    domain: "sunrise-coffee.example",
    pages: [{ path: "/", markdown: "# Sunrise Coffee Bar" }],
    model: "claude-haiku-4-5" as const,
  };
  const extractor = (anthropic: Response[], openai: Response[] = [], opts = {}) => {
    const fake = providerFetch({ anthropic, openai });
    return { extract: createBusinessExtractor(fakeAiClients(fake.fetch, opts)), calls: fake.calls };
  };

  it("asks for structured output with the versioned prompt and parses the fields", async () => {
    const { extract, calls } = extractor([json(message(JSON.stringify(COFFEE_SITE_OUTPUT)))]);
    expect(await extract(input)).toEqual(COFFEE_SITE_OUTPUT);

    const body = calls.anthropic[0] as { messages: { content: string }[]; output_config: { format: { schema: { properties: Record<string, { description?: string }> } } }; tools?: unknown };
    expect(body).toMatchObject({
      model: "claude-haiku-4-5",
      system: AUTOFILL_SYSTEM,
      output_config: { format: { type: "json_schema" } },
    });
    expect(body.messages[0].content).toContain('<page path="/">\n# Sunrise Coffee Bar\n</page>');
    // The SDK sends enums as a description hint; zod enforces them on the answer.
    expect(body.output_config.format.schema.properties.industry.description).toContain("coffee_shop");
    expect(body.tools).toBeUndefined();
    expect(calls.openai).toHaveLength(0);
  });

  it("maps a near-miss industry onto the list and anything else to empty", async () => {
    const answer = (industry: string) => extractor([json(message(JSON.stringify({ ...COFFEE_SITE_OUTPUT, industry })))]).extract;
    expect((await answer("Coffee Shop")(input)).industry).toBe("coffee_shop");
    expect((await answer("bakery")(input)).industry).toBe("");
  });

  it("fills the form from gpt-4.1-mini when Claude is out of credit, and says which model answered", async () => {
    const { extract, calls } = extractor([json(ANTHROPIC_CREDIT_ERROR, 400)], [json(openaiResponse(JSON.stringify(COFFEE_SITE_OUTPUT)))]);
    let answeredBy = "";
    expect(await extract({ ...input, answeredBy: (m) => (answeredBy = m) })).toEqual(COFFEE_SITE_OUTPUT);
    expect(answeredBy).toBe("gpt-4.1-mini-2025-04-14");
    expect(calls.openai[0]).toMatchObject({ model: "gpt-4.1-mini", instructions: AUTOFILL_SYSTEM, text: { format: { type: "json_schema", strict: true } } });
  });

  it("asks gpt-4.1 for the Sonnet retry", async () => {
    const { extract, calls } = extractor([json(ANTHROPIC_CREDIT_ERROR, 400)], [json(openaiResponse(JSON.stringify(COFFEE_SITE_OUTPUT)))]);
    await extract({ ...input, model: "claude-sonnet-5" });
    expect(calls.openai[0]).toMatchObject({ model: "gpt-4.1" });
  });

  it("tells model faults apart from API errors", async () => {
    const off = { fallbackEnabled: false };
    const refusal = extractor([json(message("", { stop_reason: "refusal" }))], [], off).extract;
    await expect(refusal(input)).rejects.toMatchObject({ modelFault: true });

    const badJson = extractor([json(message('{"name":1}'))], [], off).extract;
    await expect(badJson(input)).rejects.toMatchObject({ modelFault: true });

    const down = extractor([json({ type: "error", error: { type: "api_error" } }, 500)], [], off).extract;
    const err = await down(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ExtractError);
    expect(err).toMatchObject({ modelFault: false });

    // Both down: still an API error, so the form says auto-fill is unavailable rather than "not found".
    const bothDown = extractor([json(ANTHROPIC_CREDIT_ERROR, 400)], [json({ error: { message: "server" } }, 500)]).extract;
    await expect(bothDown(input)).rejects.toMatchObject({ name: "ExtractError", modelFault: false });
  });
});

describe("Places lookup by place_id (BUG-139)", () => {
  it("asks for one listing with the search's fields and reads it like a search result", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ id: "ChIJ-1", displayName: { text: "First Light Book Shop" }, primaryType: "book_store", types: ["book_store", "cafe"] }),
    );
    const place = await createPlaceLookup("places-key", { fetch })("ChIJ-1");
    expect(place).toMatchObject({ placeId: "ChIJ-1", name: "First Light Book Shop", primaryType: "book_store" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places/ChIJ-1");
    expect(new Headers(init?.headers).get("x-goog-fieldmask")).toBe(PLACES_FIELD_MASK.replaceAll("places.", ""));
  });

  it("gives null for a listing Google removed and throws when Places fails", async () => {
    expect(await createPlaceLookup("k", { fetch: async () => json({}, 404) })("gone")).toBeNull();
    await expect(createPlaceLookup("k", { fetch: async () => json({}, 500), retryDelayMs: 0 })("x")).rejects.toThrow(PlacesError);
  });
});
