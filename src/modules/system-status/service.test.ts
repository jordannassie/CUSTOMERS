import { describe, expect, it, vi } from "vitest";
import { joinUrl, PROBES, runProbe, stripeMode, timeAgo, withCreditStatus, workerStatus, type Probe } from "./service";

const probe = (id: string): Probe => PROBES.find((p) => p.id === id)!;

function respond(status: number, body = "{}") {
  return vi.fn<typeof fetch>(async () => new Response(body, { status }));
}

// Never answers; rejects only when the probe aborts, like a real hung connection.
const hang = vi.fn<typeof fetch>(
  (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }),
);

describe("runProbe", () => {
  it.each(PROBES.map((p) => [p.id]))("%s: a working key shows green", async (id) => {
    expect(await runProbe(probe(id), "good-key", { fetch: respond(200) })).toEqual({
      state: "ok",
      detail: "Connected. The key works.",
    });
  });

  it.each(PROBES.map((p) => [p.id]))("%s: a broken key shows red", async (id) => {
    const result = await runProbe(probe(id), "bad-key", { fetch: respond(401, '{"error":"invalid key"}') });
    expect(result).toEqual({ state: "error", detail: "The key was rejected (401)." });
  });

  it.each(PROBES.map((p) => [p.id]))("%s: a timeout shows unknown", async (id) => {
    const result = await runProbe(probe(id), "good-key", { fetch: hang, timeoutMs: 20 });
    expect(result).toEqual({ state: "unknown", detail: "No answer in time. It may be slow or down." });
  });

  it.each(PROBES.map((p) => [p.id]))("%s: no key shows not configured and makes no call", async (id) => {
    const fetch = respond(200);
    expect(await runProbe(probe(id), undefined, { fetch })).toEqual({ state: "not_configured", detail: "No key is set." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the key the way each service expects, with GET only", async () => {
    const fetch = respond(200);
    for (const p of PROBES) await runProbe(p, "k-123", { fetch });
    const calls = fetch.mock.calls.map(([url, init]) => ({ url: String(url), init }));
    expect(calls.every(({ init }) => init?.method === "GET" && init.cache === "no-store")).toBe(true);
    expect(calls.map(({ url }) => new URL(url).host)).toEqual([
      "api.openai.com",
      "api.anthropic.com",
      "api.perplexity.ai",
      "places.googleapis.com",
      "api.firecrawl.dev",
      "production-sfo.browserless.io",
      "api.resend.com",
      "api.stripe.com",
    ]);
    expect(calls[1].init?.headers).toMatchObject({ "x-api-key": "k-123" });
    expect(calls[3].init?.headers).toMatchObject({ "x-goog-api-key": "k-123", "x-goog-fieldmask": "id" });
    expect(calls[5].url).toContain("token=k-123");
  });

  it("treats a Resend sending-only key as working", async () => {
    const fetch = respond(401, '{"name":"restricted_api_key","message":"This API key is restricted to only send emails"}');
    expect(await runProbe(probe("resend"), "re_x", { fetch })).toEqual({
      state: "ok",
      detail: "Connected. The key can send email only.",
    });
  });

  it("shows red when the service is down and unknown when rate limited or unreachable", async () => {
    expect((await runProbe(probe("openai"), "k", { fetch: respond(503) })).state).toBe("error");
    expect((await runProbe(probe("openai"), "k", { fetch: respond(429) })).state).toBe("unknown");
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await runProbe(probe("openai"), "k", { fetch: offline })).toEqual({
      state: "unknown",
      detail: "Could not reach OpenAI (ChatGPT).",
    });
  });

  it("never puts the key or the response body in the detail", async () => {
    const result = await runProbe(probe("stripe"), "sk_test_secret", { fetch: respond(400, "sk_test_secret leaked") });
    expect(result.detail).not.toContain("sk_test_secret");
  });
});

describe("stripeMode", () => {
  it.each([
    ["sk_test_abc", "sandbox"],
    ["rk_test_abc", "sandbox"],
    ["sk_live_abc", "live"],
    ["rk_live_abc", "live"],
    ["something", undefined],
    [undefined, undefined],
  ])("%s is %s", (key, mode) => {
    expect(stripeMode(key)).toBe(mode);
  });
});

describe("workerStatus", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  it("is red when queued scans are waiting too long", () => {
    expect(workerStatus({ lastFinishedAt: "2026-09-27T11:59:00Z", overdueJobs: 2 }, now)).toEqual({
      state: "error",
      detail: "2 scans are waiting more than 10 minutes to start.",
    });
  });

  it("is unknown before any scan has run", () => {
    expect(workerStatus({ lastFinishedAt: null, overdueJobs: 0 }, now).state).toBe("unknown");
  });

  it("is green with the last run time", () => {
    expect(workerStatus({ lastFinishedAt: "2026-09-27T11:57:00Z", overdueJobs: 0 }, now)).toEqual({
      state: "ok",
      detail: "Last scan finished 3 min ago.",
    });
  });

  it("formats longer gaps", () => {
    expect(timeAgo(new Date("2026-09-27T09:00:00Z"), now)).toBe("3 h ago");
    expect(timeAgo(new Date("2026-09-20T12:00:00Z"), now)).toBe("7 days ago");
  });
});

describe("probe addresses (BUG-081, BUG-082)", () => {
  it("checks Perplexity on the Agent API scans use, not the retired Sonar endpoint", () => {
    expect(probe("perplexity").request("pplx-key", {}).url).toBe("https://api.perplexity.ai/v1/models");
  });

  it("checks Browserless on the configured host, keeping its path", () => {
    expect(probe("browserless").request("k", {}).url).toBe("https://production-sfo.browserless.io/meta?token=k");
    expect(probe("browserless").request("k", { browserlessUrl: "https://chrome.example/v2/" }).url).toBe("https://chrome.example/v2/meta?token=k");
  });

  it("joins a path onto a base without dropping the base's own path", () => {
    expect(joinUrl("https://host/v2", "/pdf")).toBe("https://host/v2/pdf");
    expect(joinUrl("https://host/", "pdf")).toBe("https://host/pdf");
  });
});

describe("withCreditStatus", () => {
  const ok = { id: "anthropic", name: "Anthropic (Claude)", group: "ai", state: "ok", detail: "Connected. The key works." } as const;

  it("says out of credit when real calls hit an empty account, though the key probe passed", () => {
    const [anthropic] = withCreditStatus([ok], new Set(["anthropic"]));
    expect(anthropic.state).toBe("error");
    expect(anthropic.detail).toMatch(/^Out of credit\. .*ChatGPT backup.*console\.anthropic\.com/);
  });

  it("leaves other providers and a missing key alone", () => {
    const openai = { ...ok, id: "openai", name: "OpenAI (ChatGPT)" };
    const missing = { ...ok, state: "not_configured" as const, detail: "No key is set." };
    expect(withCreditStatus([openai], new Set(["anthropic"]))).toEqual([openai]);
    expect(withCreditStatus([missing], new Set(["anthropic"]))).toEqual([missing]);
  });
});
