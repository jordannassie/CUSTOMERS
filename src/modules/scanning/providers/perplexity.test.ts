import { describe, expect, it, vi } from "vitest";
import recorded from "./fixtures/perplexity-coffee-orange.json";
import { createPerplexityCheck } from "./perplexity";
import { ProviderError } from "./request";
import type { CheckInput } from "./types";

const input: CheckInput = {
  question: "What is the best coffee shop near me in Orange, CA?",
  location: { city: "Orange", region: "CA", country: "US" },
  model: "perplexity/sonar",
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const apiError = (status: number, headers: Record<string, string> = {}) =>
  json({ error: { message: `error ${status}`, type: "api_error", code: status } }, status, headers);

function setup(...responses: Array<Response | Error>) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const r of responses) {
    if (r instanceof Error) fetch.mockRejectedValueOnce(r);
    else fetch.mockResolvedValueOnce(r);
  }
  const sleep = vi.fn(async () => {});
  return { fetch, sleep, run: createPerplexityCheck("pplx-test", { fetch, sleep }) };
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ProviderError);
  return err as ProviderError;
}

const [searchItem, messageItem] = recorded.output;
const withText = (text: string, annotations: unknown[] = []) => ({
  ...recorded,
  output: [searchItem, { ...messageItem, content: [{ type: "output_text", text, annotations }] }],
});

describe("createPerplexityCheck", () => {
  it("sends Sonar with web search and the business location", async () => {
    const { fetch, run } = setup(json(recorded));
    await run(input);

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.perplexity.ai/v1/agent");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer pplx-test");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "perplexity/sonar",
      input: input.question,
      tools: [{ type: "web_search", user_location: { country: "US", region: "CA", city: "Orange" } }],
      max_output_tokens: 2000,
      store: false,
    });
  });

  it("returns the answer, usage and real cost", async () => {
    const result = await setup(json(recorded)).run(input);

    expect(result.answerText).toMatch(/^Here are some of the best coffee shops in Orange, CA:/);
    expect(result.answerText).toContain("**Portola Coffee Roasters**");
    expect(result.model).toBe("perplexity/sonar");
    expect(result.usage).toEqual({ inputTokens: 6200, cachedInputTokens: 0, outputTokens: 380, searchCalls: 1 });
    // 6200 * 0.25/1M + 380 * 2.50/1M + 1 * $0.0025, the same total Perplexity reports in usage.cost
    expect(result.costUsd).toBe(0.005);
    expect(result.costUsd).toBe(recorded.usage.cost.total_cost);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("takes citations from annotations and [n] markers, deduplicated in order", async () => {
    const { citations } = await setup(json(recorded)).run(input);

    expect(citations).toEqual([
      { url: "https://www.yelp.com/biz/contra-coffee-and-tea-orange", title: "CONTRA COFFEE & TEA - Orange CA - Yelp" },
      { url: "https://www.portolacoffeeroasters.com/", title: "Portola Coffee Roasters" },
      {
        url: "https://www.tripadvisor.com/Restaurants-g32837-c8-Orange_California.html",
        title: "THE 10 BEST Cafés in Orange - Tripadvisor",
      },
    ]);
  });

  it("ignores markers that point at no search result", async () => {
    const { citations } = await setup(json(withText("Try Portola[2] or the new place[9]."))).run(input);
    expect(citations.map((c) => c.url)).toEqual(["https://www.portolacoffeeroasters.com/"]);
  });

  it("falls back to every search result when the answer cites none", async () => {
    const { citations } = await setup(json(withText("Contra Coffee & Tea and Portola are both good."))).run(input);
    expect(citations).toHaveLength(4);
  });

  it("counts searches from search_results items when usage does not report them", async () => {
    const usage = { ...recorded.usage, tool_calls_details: undefined };
    const result = await setup(json({ ...recorded, usage })).run(input);
    expect(result.usage.searchCalls).toBe(1);
  });

  it("accepts an answer that did not search at all", async () => {
    const body = { ...recorded, output: [{ ...messageItem, content: [{ type: "output_text", text: "Try Contra." }] }] };
    const usage = { ...recorded.usage, tool_calls_details: {} };
    const result = await setup(json({ ...body, usage })).run(input);

    expect(result).toMatchObject({ answerText: "Try Contra.", citations: [] });
    expect(result.usage.searchCalls).toBe(0);
  });

  it("retries a 429 after the Retry-After delay, then succeeds", async () => {
    const { fetch, sleep, run } = setup(apiError(429, { "retry-after": "3" }), json(recorded));
    await expect(run(input)).resolves.toMatchObject({ model: "perplexity/sonar" });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3_000);
  });

  it("retries 5xx with backoff, then gives up as retryable", async () => {
    const { fetch, sleep, run } = setup(apiError(500), apiError(502), apiError(503));
    const err = await failure(run(input));

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(err).toMatchObject({ provider: "perplexity", kind: "server", status: 503, retryable: true, attempts: 3 });
    const [first, second] = sleep.mock.calls.map((call) => (call as unknown as [number])[0]);
    expect(first).toBeGreaterThanOrEqual(1_000);
    expect(second).toBeGreaterThanOrEqual(2_000);
  });

  it("recovers when a 5xx or a network error is followed by success", async () => {
    const { fetch, run } = setup(apiError(503), new TypeError("fetch failed"), json(recorded));
    await expect(run(input)).resolves.toMatchObject({ answerText: expect.stringContaining("Orange") });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("stops at the timeout and reports it as retryable without retrying", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const run = createPerplexityCheck("pplx-test", { fetch, sleep: async () => {}, timeoutMs: 20 });
    const err = await failure(run(input));

    expect(err).toMatchObject({ kind: "timeout", retryable: true, attempts: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404, 422])("does not retry a %i", async (status) => {
    const { fetch, sleep, run } = setup(apiError(status));
    const err = await failure(run(input));

    expect(err).toMatchObject({ kind: "client", status, retryable: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("treats a failed run as retryable and an incomplete one as final", async () => {
    const failed = { ...recorded, status: "failed", error: { message: "upstream error" } };
    const err = await failure(setup(json(failed)).run(input));
    expect(err).toMatchObject({ kind: "server", retryable: true });
    expect(err.message).toContain("upstream error");

    const incomplete = { ...recorded, status: "incomplete" };
    expect(await failure(setup(json(incomplete)).run(input))).toMatchObject({ kind: "bad_response", retryable: false });
  });

  it("rejects a response with no answer text or an unknown shape", async () => {
    const noText = { ...recorded, output: [searchItem] };
    expect(await failure(setup(json(noText)).run(input))).toMatchObject({ kind: "bad_response", retryable: false });
    expect(await failure(setup(json({ hello: "world" })).run(input))).toMatchObject({ kind: "bad_response" });
  });

  it("refuses a model it does not run", async () => {
    const { run, fetch } = setup();
    await expect(run({ ...input, model: "claude-haiku-4-5" })).rejects.toThrow(/only runs perplexity\/sonar/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
