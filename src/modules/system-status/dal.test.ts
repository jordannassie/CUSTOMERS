import { describe, expect, it, vi } from "vitest";

// Fake keys only: the fetch below answers every call, so no real service is ever reached.
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  const fake: Record<string, string | undefined> = {
    OPENAI_API_KEY: "sk-fake-openai",
    ANTHROPIC_API_KEY: "sk-ant-fake",
    PERPLEXITY_API_KEY: "pplx-fake",
    GOOGLE_PLACES_API_KEY: "fake-places",
    FIRECRAWL_API_KEY: "fc-fake",
    BROWSERLESS_API_KEY: undefined,
    RESEND_API_KEY: "re_fake",
    STRIPE_SECRET_KEY: "sk_test_fake",
  };
  return { env: new Proxy(env, { get: (target, key) => (key in fake ? fake[key as string] : Reflect.get(target, key)) }) };
});
const guard = vi.hoisted(() => ({ allow: true }));
vi.mock("@/modules/auth", () => ({
  requireAdmin: async () => {
    if (!guard.allow) throw new Error("REDIRECT /login");
    return { id: "admin", email: "admin@example.test" };
  },
}));

const { getSystemStatus } = await import("./dal");

function fetchWith(statusByHost: Record<string, number>) {
  return vi.fn<typeof fetch>(async (url) => {
    const host = new URL(String(url)).host;
    if (!(host in statusByHost)) throw new Error(`unexpected call to ${host}`);
    return new Response("{}", { status: statusByHost[host] });
  });
}

const allWorking = {
  "api.openai.com": 200,
  "api.anthropic.com": 200,
  "api.perplexity.ai": 200,
  "places.googleapis.com": 200,
  "api.firecrawl.dev": 200,
  "api.resend.com": 200,
  "api.stripe.com": 200,
};

describe("getSystemStatus", () => {
  it("checks every service live: a key that breaks between two loads turns red", async () => {
    const first = await getSystemStatus({ fetch: fetchWith(allWorking) });
    const second = await getSystemStatus({ fetch: fetchWith({ ...allWorking, "api.openai.com": 401 }) });

    const state = (s: typeof first, id: string) => s.services.find((x) => x.id === id)?.state;
    expect(state(first, "openai")).toBe("ok");
    expect(state(second, "openai")).toBe("error");
    expect(state(second, "anthropic")).toBe("ok");
  });

  it("lists every service from the task, with Stripe mode and blank keys as not configured", async () => {
    const status = await getSystemStatus({ fetch: fetchWith(allWorking) });

    expect(status.services.map((s) => s.id)).toEqual([
      "openai",
      "anthropic",
      "perplexity",
      "google_places",
      "firecrawl",
      "browserless",
      "resend",
      "stripe",
      "worker",
      "schedules",
    ]);
    expect(status.services.find((s) => s.id === "stripe")?.mode).toBe("sandbox");
    expect(status.services.find((s) => s.id === "browserless")?.state).toBe("not_configured");
    // Reads the local scan queue; its state depends on what other tests left there.
    expect(status.services.find((s) => s.id === "worker")?.detail).not.toMatch(/Could not read/);
  });

  it("refuses non-admins before calling any service", async () => {
    guard.allow = false;
    const fetch = fetchWith(allWorking);
    await expect(getSystemStatus({ fetch })).rejects.toThrow("REDIRECT");
    expect(fetch).not.toHaveBeenCalled();
    guard.allow = true;
  });
});
