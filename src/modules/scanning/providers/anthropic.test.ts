import { describe, expect, it, vi } from "vitest";
import { createAnthropicCheck } from "./anthropic";
import recorded from "./fixtures/anthropic-coffee-orange.json";
import { ProviderError } from "./request";
import type { CheckInput } from "./types";

const input: CheckInput = {
  question: "What is the best coffee shop near me in Orange, CA?",
  location: { city: "Orange", region: "CA", country: "US" },
  model: "claude-haiku-4-5",
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const apiError = (type: string, status: number, headers: Record<string, string> = {}) =>
  json({ type: "error", error: { type, message: type } }, status, headers);

function setup(...responses: Array<Response | Error>) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const r of responses) {
    if (r instanceof Error) fetch.mockRejectedValueOnce(r);
    else fetch.mockResolvedValueOnce(r);
  }
  const sleep = vi.fn(async () => {});
  return { fetch, sleep, run: createAnthropicCheck("sk-ant-test", { fetch, sleep }) };
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ProviderError);
  return err as ProviderError;
}

type Block = (typeof recorded.content)[number];
const withContent = (content: unknown[]) => ({ ...recorded, content });
const searchError = (error_code: string) => ({
  type: "web_search_tool_result",
  tool_use_id: "srvtoolu_err",
  caller: { type: "direct" },
  content: { type: "web_search_tool_result_error", error_code },
});
const [preamble, toolUse, toolResult, ...answer] = recorded.content as Block[];

describe("createAnthropicCheck", () => {
  it("sends the question with web search and the business location", async () => {
    const { fetch, run } = setup(json(recorded));
    await run(input);

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    expect(new Headers(init?.headers).get("x-api-key")).toBe("sk-ant-test");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "claude-haiku-4-5",
      messages: [{ role: "user", content: input.question }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
          user_location: { type: "approximate", city: "Orange", region: "CA", country: "US" },
        },
      ],
    });
  });

  it("returns the answer after the last search, usage and real cost", async () => {
    const { run } = setup(json(recorded));
    const result = await run(input);

    expect(result.answerText).toMatch(/^Here are some of the best coffee shops in Orange, CA:/);
    expect(result.answerText).toContain("1. **Contra Coffee & Tea** on Glassell Street, known for its nitro coffee");
    expect(result.answerText).not.toContain("I'll search");
    expect(result.model).toBe("claude-haiku-4-5-20251001");
    expect(result.usage).toEqual({ inputTokens: 9120, cachedInputTokens: 0, outputTokens: 412, searchCalls: 1 });
    // 9120 * 1/1M + 412 * 5/1M + 1 * $0.01
    expect(result.costUsd).toBe(0.02118);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("takes citations from web_search_result_location, deduplicated in order", async () => {
    const { run } = setup(json(recorded));
    const { citations } = await run(input);

    expect(citations).toEqual([
      { url: "https://www.yelp.com/biz/contra-coffee-and-tea-orange", title: "CONTRA COFFEE & TEA - Orange CA - Yelp" },
      { url: "https://www.portolacoffeeroasters.com/", title: "Portola Coffee Roasters" },
      {
        url: "https://www.tripadvisor.com/Restaurants-g32837-c8-Orange_California.html",
        title: "THE 10 BEST Cafés in Orange - Tripadvisor",
      },
    ]);
  });

  it("counts cache reads as cached input", async () => {
    const usage = { ...recorded.usage, input_tokens: 1000, cache_read_input_tokens: 4000 };
    const { run } = setup(json({ ...recorded, usage }));
    expect((await run(input)).usage).toMatchObject({ inputTokens: 5000, cachedInputTokens: 4000 });
  });

  it("fails a check whose only web search returned an error inside a 200", async () => {
    const body = withContent([preamble, toolUse, searchError("too_many_requests"), ...answer]);
    const err = await failure(setup(json({ ...body, usage: { ...recorded.usage, server_tool_use: { web_search_requests: 0 } } })).run(input));

    expect(err).toMatchObject({ kind: "search", retryable: true, provider: "anthropic" });
    expect(err.message).toContain("too_many_requests");
  });

  it("keeps the answer when a later search hit max_uses after good searches", async () => {
    const body = withContent([preamble, toolUse, toolResult, toolUse, searchError("max_uses_exceeded"), ...answer]);
    const result = await setup(json(body)).run(input);

    expect(result.answerText).toContain("Portola Coffee Roasters");
    expect(result.citations).toHaveLength(3);
  });

  it("accepts an answer that did not search at all", async () => {
    const body = withContent([{ type: "text", text: "Try Contra Coffee & Tea." }]);
    const usage = { ...recorded.usage, server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 } };
    const result = await setup(json({ ...body, usage })).run(input);

    expect(result).toMatchObject({ answerText: "Try Contra Coffee & Tea.", citations: [] });
    expect(result.usage.searchCalls).toBe(0);
  });

  it("retries a 429 after the Retry-After delay, then succeeds", async () => {
    const { fetch, sleep, run } = setup(apiError("rate_limit_error", 429, { "retry-after": "2" }), json(recorded));
    await expect(run(input)).resolves.toMatchObject({ model: "claude-haiku-4-5-20251001" });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("retries 529 overloaded and 5xx, then gives up as retryable", async () => {
    const { fetch, sleep, run } = setup(
      apiError("overloaded_error", 529),
      apiError("api_error", 500),
      apiError("overloaded_error", 529),
    );
    const err = await failure(run(input));

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(err).toMatchObject({ kind: "server", status: 529, retryable: true, attempts: 3 });
    const [first, second] = sleep.mock.calls.map((call) => (call as unknown as [number])[0]);
    expect(first).toBeGreaterThanOrEqual(1_000);
    expect(second).toBeGreaterThanOrEqual(2_000);
  });

  it("recovers when an overload or a network error is followed by success", async () => {
    const { fetch, run } = setup(apiError("overloaded_error", 529), new TypeError("fetch failed"), json(recorded));
    await expect(run(input)).resolves.toMatchObject({ answerText: expect.stringContaining("Orange") });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("stops at the timeout and reports it as retryable without retrying", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const run = createAnthropicCheck("sk-ant-test", { fetch, sleep: async () => {}, timeoutMs: 20 });
    const err = await failure(run(input));

    expect(err).toMatchObject({ kind: "timeout", retryable: true, attempts: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, "invalid_request_error"],
    [401, "authentication_error"],
    [403, "permission_error"],
    [404, "not_found_error"],
  ])("does not retry a %i", async (status, type) => {
    const { fetch, sleep, run } = setup(apiError(type, status));
    const err = await failure(run(input));

    expect(err).toMatchObject({ kind: "client", status, retryable: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("rejects a response with no answer text or an unknown shape", async () => {
    const noText = withContent([preamble, toolUse, toolResult]);
    expect(await failure(setup(json(noText)).run(input))).toMatchObject({ kind: "bad_response", retryable: false });
    expect(await failure(setup(json({ hello: "world" })).run(input))).toMatchObject({ kind: "bad_response" });
  });

  it("treats pause_turn as retryable and a refusal as final", async () => {
    const paused = { ...recorded, stop_reason: "pause_turn" };
    expect(await failure(setup(json(paused)).run(input))).toMatchObject({ kind: "server", retryable: true });
    const refused = { ...recorded, stop_reason: "refusal" };
    expect(await failure(setup(json(refused)).run(input))).toMatchObject({ kind: "bad_response", retryable: false });
  });

  it("refuses a model it does not run", async () => {
    const { run, fetch } = setup();
    await expect(run({ ...input, model: "gpt-4.1-mini" })).rejects.toThrow(/only runs claude-haiku-4-5/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
