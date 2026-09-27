// The three provider clients against hand-built responses; fetch is mocked, nothing goes out.
import { describe, expect, it, vi } from "vitest";
import { createBusinessExtractor, ExtractError } from "./extract";
import { createFirecrawlScraper, FIRECRAWL_SCRAPE_URL, SITE_PATHS, toPage } from "./firecrawl";
import { COFFEE_SITE_OUTPUT } from "./fixtures";
import { createPlacesSearch, PLACES_FIELD_MASK, PLACES_TEXT_SEARCH_URL, PlacesError } from "./places";
import { AUTOFILL_SYSTEM } from "./prompts/business-autofill.v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const scrape = (markdown: string, metadata: Record<string, unknown> = {}) => ({
  success: true,
  data: { markdown, metadata: { title: "Home", statusCode: 200, ...metadata } },
});

describe("Firecrawl scraper", () => {
  it("asks for the four pages as main-content markdown", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(scrape("# Hello")));
    const pages = await createFirecrawlScraper("fc-test", { fetch })("sunrise-coffee.example");

    expect(pages.map((p) => [p.path, p.status])).toEqual(SITE_PATHS.map((p) => [p, "ok"]));
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(FIRECRAWL_SCRAPE_URL);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fc-test");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      url: "https://sunrise-coffee.example/",
      formats: ["markdown"],
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
      { longText: "Springfield", shortText: "Springfield", types: ["locality", "political"] },
      { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1", "political"] },
      { longText: "United States", shortText: "US", types: ["country", "political"] },
    ],
    primaryType: "coffee_shop",
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
    expect(JSON.parse(String(init?.body))).toEqual({ textQuery: "sunrise-coffee.example", pageSize: 5 });
    expect(found).toEqual({
      placeId: "ChIJ-fixture",
      name: "Sunrise Coffee Bar",
      address: "120 Main St, Springfield, IL 62701, USA",
      phone: "(217) 555-0142",
      primaryType: "coffee_shop",
      websiteUri: "https://sunrise-coffee.example/",
      city: "Springfield",
      state: "IL",
      country: "US",
    });
  });

  it("returns an empty list for no match and throws on an error status", async () => {
    const empty = vi.fn<typeof globalThis.fetch>(async () => json({}));
    expect(await createPlacesSearch("gp-test", { fetch: empty })("nothing")).toEqual([]);
    const denied = vi.fn<typeof globalThis.fetch>(async () => json({ error: { status: "PERMISSION_DENIED" } }, 403));
    await expect(createPlacesSearch("gp-test", { fetch: denied })("x")).rejects.toThrow(PlacesError);
  });
});

describe("Claude extractor", () => {
  const message = (text: string, extra: Record<string, unknown> = {}) => ({
    id: "msg_fixture",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 900, output_tokens: 150 },
    ...extra,
  });
  const input = {
    domain: "sunrise-coffee.example",
    pages: [{ path: "/", markdown: "# Sunrise Coffee Bar" }],
    model: "claude-haiku-4-5" as const,
  };

  it("asks for structured output with the versioned prompt and parses the fields", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(message(JSON.stringify(COFFEE_SITE_OUTPUT))));
    expect(await createBusinessExtractor("sk-ant-test", { fetch })(input)).toEqual(COFFEE_SITE_OUTPUT);

    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: "claude-haiku-4-5",
      system: AUTOFILL_SYSTEM,
      output_config: { format: { type: "json_schema" } },
    });
    expect(body.messages[0].content).toContain('<page path="/">\n# Sunrise Coffee Bar\n</page>');
    // The SDK sends enums as a description hint; zod enforces them on the answer.
    expect(body.output_config.format.schema.properties.industry.description).toContain("coffee_shop");
    expect(body.tools).toBeUndefined();
  });

  it("maps a near-miss industry onto the list and anything else to empty", async () => {
    const answer = (industry: string) =>
      vi.fn<typeof globalThis.fetch>(async () => json(message(JSON.stringify({ ...COFFEE_SITE_OUTPUT, industry }))));
    expect((await createBusinessExtractor("k", { fetch: answer("Coffee Shop") })(input)).industry).toBe("coffee_shop");
    expect((await createBusinessExtractor("k", { fetch: answer("bakery") })(input)).industry).toBe("");
  });

  it("tells model faults apart from API errors", async () => {
    const refusal = vi.fn<typeof globalThis.fetch>(async () => json(message("", { stop_reason: "refusal" })));
    await expect(createBusinessExtractor("k", { fetch: refusal })(input)).rejects.toMatchObject({ modelFault: true });

    const badJson = vi.fn<typeof globalThis.fetch>(async () => json(message('{"name":1}')));
    await expect(createBusinessExtractor("k", { fetch: badJson })(input)).rejects.toMatchObject({ modelFault: true });

    const down = vi.fn<typeof globalThis.fetch>(async () => json({ type: "error", error: { type: "api_error" } }, 500));
    const err = await createBusinessExtractor("k", { fetch: down })(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ExtractError);
    expect(err).toMatchObject({ modelFault: false });
  });
});
