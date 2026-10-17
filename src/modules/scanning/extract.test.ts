import { describe, expect, it } from "vitest";
import { AiUnavailableError, fakeAiClients, openaiResponse, providerFetch } from "@/modules/ai";
import {
  createNameExtractor,
  orderedNames,
  readStoredExtraction,
} from "./extract";
import { alsoRecommended, isSameBusiness, matchNames } from "./extract-match";
import recorded from "./fixtures/extract-names-message.json";
import { EXTRACT_NAMES_SYSTEM, EXTRACT_NAMES_VERSION } from "./prompts/extract-names.v1";

const ANSWER = "1. **Contra Coffee & Tea**: great pour-overs.\n2. **Portola Coffee Roasters**: see Yelp.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup(anthropic: Response[], openai: Response[] = [], opts = {}) {
  const fake = providerFetch({ anthropic, openai });
  return { calls: fake.calls, extract: createNameExtractor(fakeAiClients(fake.fetch, opts)) };
}

const withText = (text: string, extra: Record<string, unknown> = {}) => ({
  ...recorded,
  content: [{ type: "text", text }],
  ...extra,
});

describe("createNameExtractor", () => {
  it("asks Claude Haiku for structured output with the versioned prompt", async () => {
    const { calls, extract } = setup([json(recorded)]);
    await extract(ANSWER);

    const body = calls.anthropic[0] as { output_config: { format: { schema: unknown } }; tools?: unknown };
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
    const { extract } = setup([json(recorded)]);
    const result = await extract(ANSWER);

    expect(result.promptVersion).toBe(EXTRACT_NAMES_VERSION);
    expect(result.model).toBe("claude-haiku-4-5-20251001");
    expect(result).toMatchObject({ provider: "anthropic", fellBack: false });
    expect(result.names).toEqual([
      { name: "Contra Coffee & Tea", position: 1 },
      { name: "Portola Coffee Roasters", position: 2 },
      { name: "Kaffee Meister", position: 3 },
    ]);
    // 900 input at $1/M plus 60 output at $5/M.
    expect(result.costUsd).toBe(0.0012);
  });

  it("returns an empty list when the answer names no business", async () => {
    const { extract } = setup([json(withText('{"businesses":[]}'))]);
    expect((await extract("I could not find any coffee shops.")).names).toEqual([]);
  });

  it("lists the names with gpt-4.1-mini when Claude is overloaded, at its price", async () => {
    const overloaded = json({ type: "error", error: { type: "overloaded_error", message: "overloaded" } }, 529);
    const names = JSON.stringify({ businesses: [{ name: "Contra Coffee & Tea" }, { name: "Kaffee Meister" }] });
    const { calls, extract } = setup([overloaded], [json(openaiResponse(names))]);
    const result = await extract(ANSWER);
    expect(result).toMatchObject({ provider: "openai", model: "gpt-4.1-mini-2025-04-14", fellBack: true });
    expect(result.primaryError).toMatch(/server 529/);
    expect(result.names.map((n) => n.name)).toEqual(["Contra Coffee & Tea", "Kaffee Meister"]);
    // 900 input at $0.40/M plus 150 output at $1.60/M.
    expect(result.costUsd).toBe(0.0006);
    expect(calls.openai[0]).toMatchObject({ model: "gpt-4.1-mini", input: `<answer>\n${ANSWER}\n</answer>` });
  });

  it.each([
    ["a refusal", withText("", { stop_reason: "refusal" }), 1],
    ["a cut-off list", withText('{"businesses":[{"name":"Con', { stop_reason: "max_tokens" }), 2],
    ["JSON outside the schema", withText('{"names":["Contra"]}'), 2],
  ])("fails as a model fault on %s when the backup is off", async (_label, body, tries) => {
    const { calls, extract } = setup([json(body)], [], { fallbackEnabled: false });
    const err = await extract(ANSWER).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect((err as AiUnavailableError).modelFault).toBe(true);
    // A refusal is final; a cut-off or malformed answer gets one more try.
    expect(calls.anthropic).toHaveLength(tries);
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

  it("ignores spacing and punctuation inside a name (B6)", () => {
    expect(isSameBusiness("Book Woman", { name: "BookWoman" })).toBe(true);
    expect(isSameBusiness("Book-Woman", { name: "BookWoman" })).toBe(true);
    expect(isSameBusiness("BookWoman", { name: "Book Woman" })).toBe(true);
    expect(isSameBusiness("Book Woman Austin", { name: "BookWoman" })).toBe(true);
    expect(isSameBusiness("Book People", { name: "BookWoman" })).toBe(false);
    expect(isSameBusiness("A Ce", { name: "Ace" })).toBe(false);
  });

  it("does not let a generic name match inside a longer one", () => {
    expect(isSameBusiness("Ace Hardware", { name: "Ace" })).toBe(false);
    expect(isSameBusiness("Ace", { name: "Ace" })).toBe(true);
    expect(isSameBusiness("Ace Cafe", competitors[1])).toBe(true);
    expect(isSameBusiness("Coffee", { name: "Portola Coffee Roasters" })).toBe(false);
  });
});
