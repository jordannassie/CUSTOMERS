import { describe, expect, it, vi } from "vitest";
import {
  createNameExtractor,
  orderedNames,
  readStoredExtraction,
  storeExtraction,
  toStoredExtraction,
} from "./extract";
import { alsoRecommended, isSameBusiness, matchNames } from "./extract-match";
import recorded from "./fixtures/extract-names-message.json";
import { EXTRACT_NAMES_SYSTEM, EXTRACT_NAMES_VERSION } from "./prompts/extract-names.v1";
import { ProviderError } from "./providers/request";

const ANSWER = "1. **Contra Coffee & Tea**: great pour-overs.\n2. **Portola Coffee Roasters**: see Yelp.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup(...responses: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const r of responses) fetch.mockResolvedValueOnce(r);
  const sleep = vi.fn(async () => {});
  return { fetch, sleep, extract: createNameExtractor("sk-ant-test", { fetch, sleep }) };
}

const withText = (text: string, extra: Record<string, unknown> = {}) => ({
  ...recorded,
  content: [{ type: "text", text }],
  ...extra,
});

describe("createNameExtractor", () => {
  it("asks Claude Haiku for structured output with the versioned prompt", async () => {
    const { fetch, extract } = setup(json(recorded));
    await extract(ANSWER);

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: "claude-haiku-4-5",
      system: EXTRACT_NAMES_SYSTEM,
      messages: [{ role: "user", content: `<answer>\n${ANSWER}\n</answer>` }],
      output_config: { format: { type: "json_schema" } },
    });
    expect(body.output_config.format.schema).toMatchObject({
      type: "object",
      required: ["businesses"],
      additionalProperties: false,
    });
    expect(body.tools).toBeUndefined();
  });

  it("returns names in order of first appearance, without blanks or repeats", async () => {
    const { extract } = setup(json(recorded));
    const result = await extract(ANSWER);

    expect(result.promptVersion).toBe(EXTRACT_NAMES_VERSION);
    expect(result.model).toBe("claude-haiku-4-5-20251001");
    expect(result.names).toEqual([
      { name: "Contra Coffee & Tea", position: 1 },
      { name: "Portola Coffee Roasters", position: 2 },
      { name: "Kaffee Meister", position: 3 },
    ]);
    // 900 input at $1/M plus 60 output at $5/M.
    expect(result.costUsd).toBe(0.0012);
  });

  it("returns an empty list when the answer names no business", async () => {
    const { extract } = setup(json(withText('{"businesses":[]}')));
    expect((await extract("I could not find any coffee shops.")).names).toEqual([]);
  });

  it("retries a 529 overload and then succeeds", async () => {
    const overloaded = json({ type: "error", error: { type: "overloaded_error", message: "overloaded" } }, 529);
    const { fetch, sleep, extract } = setup(overloaded, json(recorded));
    expect((await extract(ANSWER)).names).toHaveLength(3);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it.each([
    ["a refusal", withText("", { stop_reason: "refusal" }), /declined/],
    ["a cut-off list", withText('{"businesses":[{"name":"Con', { stop_reason: "max_tokens" }), /output tokens/],
    ["JSON outside the schema", withText('{"names":["Contra"]}'), /does not match/],
  ])("fails without retrying on %s", async (_label, body, message) => {
    const { fetch, extract } = setup(json(body));
    const err = await extract(ANSWER).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).kind).toBe("bad_response");
    expect((err as ProviderError).message).toMatch(message);
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe("orderedNames", () => {
  it("treats legal suffixes and '&' as the same business", () => {
    expect(orderedNames(["Ace Plumbing LLC", "Ace Plumbing", "Rapid Rooter & Drain", "Rapid Rooter and Drain"])).toEqual([
      { name: "Ace Plumbing LLC", position: 1 },
      { name: "Rapid Rooter & Drain", position: 2 },
    ]);
  });
});

describe("stored extraction", () => {
  it("round-trips through the cache field and is written by the injected writer", async () => {
    const { extract } = setup(json(recorded));
    const extraction = await extract(ANSWER);
    const save = vi.fn(async () => {});
    await storeExtraction("key-1", extraction, save);

    const stored = toStoredExtraction(extraction);
    expect(save).toHaveBeenCalledWith("key-1", stored);
    expect(stored).not.toHaveProperty("costUsd");
    expect(readStoredExtraction(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });

  it("ignores empty fields and older prompt versions so they are extracted again", () => {
    expect(readStoredExtraction(null)).toBeNull();
    expect(readStoredExtraction({ promptVersion: "extract-names.v0", model: "m", names: [] })).toBeNull();
  });
});

describe("matchNames", () => {
  const business = { name: "Contra Coffee & Tea, LLC", website: "https://contracoffee.com" };
  const competitors = [{ name: "Portola Coffee Roasters" }, { name: "Ace", aliases: ["Ace Cafe"] }];

  it("marks the business, tracked competitors, and the rest as also recommended", () => {
    const matched = matchNames(
      [
        { name: "Contra Coffee and Tea", position: 1 },
        { name: "Portola Coffee Roasters (Orange)", position: 2 },
        { name: "Kaffee Meister", position: 3 },
      ],
      business,
      competitors,
    );
    expect(matched.map((m) => [m.matches, m.competitorName])).toEqual([
      ["business", null],
      ["competitor", "Portola Coffee Roasters"],
      [null, null],
    ]);
    expect(alsoRecommended(matched).map((m) => m.name)).toEqual(["Kaffee Meister"]);
  });

  it("matches on the website domain", () => {
    expect(isSameBusiness("contracoffee.com", business)).toBe(true);
  });

  it("does not let a generic name match inside a longer one", () => {
    expect(isSameBusiness("Ace Hardware", { name: "Ace" })).toBe(false);
    expect(isSameBusiness("Ace", { name: "Ace" })).toBe(true);
    expect(isSameBusiness("Ace Cafe", competitors[1])).toBe(true);
    expect(isSameBusiness("Coffee", { name: "Portola Coffee Roasters" })).toBe(false);
  });
});
