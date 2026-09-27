import { describe, expect, it, vi } from "vitest";
import recorded from "./fixtures/openai-coffee-orange.json";
import { createOpenAICheck } from "./openai";
import { ProviderError } from "./request";
import type { CheckInput } from "./types";
import { cleanUrl } from "./urls";

const input: CheckInput = {
  question: "What is the best coffee shop near me in Orange, CA?",
  location: { city: "Orange", region: "CA", country: "US" },
  model: "gpt-4.1-mini",
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

function setup(...responses: Array<Response | Error>) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const r of responses) {
    if (r instanceof Error) fetch.mockRejectedValueOnce(r);
    else fetch.mockResolvedValueOnce(r);
  }
  const sleep = vi.fn(async () => {});
  return { fetch, sleep, run: createOpenAICheck("sk-test", { fetch, sleep }) };
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ProviderError);
  return err as ProviderError;
}

describe("createOpenAICheck", () => {
  it("sends the question with web search and the business location", async () => {
    const { fetch, run } = setup(json(recorded));
    await run(input);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer sk-test");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-4.1-mini",
      input: input.question,
      tools: [{ type: "web_search", user_location: { type: "approximate", city: "Orange", region: "CA", country: "US" } }],
      store: false,
    });
  });

  it("returns the answer, usage and real cost from a recorded response", async () => {
    const { run } = setup(json(recorded));
    const result = await run(input);

    expect(result.answerText).toContain("Contra Coffee & Tea");
    expect(result.model).toBe("gpt-4.1-mini-2025-04-14");
    // One search action; the open_page action is not billed as a separate call.
    expect(result.usage).toEqual({ inputTokens: 8214, cachedInputTokens: 0, outputTokens: 286, searchCalls: 1 });
    // 8214 * 0.40/1M + 286 * 1.60/1M + 1 * $0.01
    expect(result.costUsd).toBe(0.013743);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("takes citations from url_citation annotations, deduplicated and without the OpenAI tag", async () => {
    const { run } = setup(json(recorded));
    const { citations } = await run(input);

    expect(citations).toEqual([
      { url: "https://www.yelp.com/biz/contra-coffee-and-tea-orange", title: "CONTRA COFFEE & TEA - Orange CA - Yelp" },
      { url: "https://www.portolacoffeeroasters.com/", title: "Portola Coffee Roasters" },
      { url: "https://www.yelp.com/search?find_desc=coffee&find_loc=Orange%2C+CA", title: "Best Coffee in Orange, CA - Yelp" },
    ]);
  });

  it("retries a 429 after the Retry-After delay, then succeeds", async () => {
    const { fetch, sleep, run } = setup(json({ error: { message: "Rate limit" } }, 429, { "retry-after": "2" }), json(recorded));
    const result = await run(input);

    expect(result.answerText).not.toBe("");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("retries 5xx twice with growing backoff, then gives up as retryable", async () => {
    const { fetch, sleep, run } = setup(json({}, 500), json({}, 502), json({}, 503));
    const err = await failure(run(input));

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(err).toMatchObject({ kind: "server", status: 503, retryable: true, attempts: 3, provider: "openai" });
    const [first, second] = sleep.mock.calls.map((call) => (call as unknown as [number])[0]);
    expect(first).toBeGreaterThanOrEqual(1_000);
    expect(second).toBeGreaterThanOrEqual(2_000);
  });

  it("recovers when a 5xx or a network error is followed by success", async () => {
    const { fetch, run } = setup(json({}, 500), new TypeError("fetch failed"), json(recorded));
    await expect(run(input)).resolves.toMatchObject({ model: "gpt-4.1-mini-2025-04-14" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("stops at the timeout and reports it as retryable without retrying", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const run = createOpenAICheck("sk-test", { fetch, sleep: async () => {}, timeoutMs: 20 });
    const err = await failure(run(input));

    expect(err).toMatchObject({ kind: "timeout", retryable: true, attempts: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404])("does not retry a %i", async (status) => {
    const { fetch, sleep, run } = setup(json({ error: { message: "nope" } }, status));
    const err = await failure(run(input));

    expect(err).toMatchObject({ kind: "client", status, retryable: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("rejects a response with no answer text or an unknown shape", async () => {
    const noText = { ...recorded, output: recorded.output.filter((item) => item.type !== "message") };
    expect(await failure(setup(json(noText)).run(input))).toMatchObject({ kind: "bad_response", retryable: false });
    expect(await failure(setup(json({ hello: "world" })).run(input))).toMatchObject({ kind: "bad_response" });
  });

  it("treats a failed response status as a retryable server error", async () => {
    const failed = { ...recorded, status: "failed", error: { message: "server_error" } };
    expect(await failure(setup(json(failed)).run(input))).toMatchObject({ kind: "server", retryable: true });
  });

  it("refuses a model it does not run", async () => {
    const { run, fetch } = setup();
    await expect(run({ ...input, model: "claude-haiku-4-5" as never })).rejects.toThrow(/only runs gpt-4.1-mini/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("cleanUrl", () => {
  it("keeps other query params and drops non-web links", () => {
    expect(cleanUrl("https://a.com/x?utm_source=newsletter&id=1")).toBe("https://a.com/x?utm_source=newsletter&id=1");
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
    expect(cleanUrl("not a url")).toBeNull();
  });
});
