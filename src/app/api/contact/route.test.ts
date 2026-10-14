import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: () => ({ insert }) }),
}));
// The shared rate limit table is tested in the rate-limit module; here each run counts in memory.
const limiter = vi.hoisted(() => ({ down: false }));
vi.mock("@/modules/rate-limit/dal", async () => {
  const { memoryStore } = await import("@/modules/rate-limit/service");
  return {
    databaseStore: () => {
      const memory = memoryStore();
      return { hit: (key: string, windowMs: number, now: number) => (limiter.down ? Promise.reject(new Error("database down")) : memory.hit(key, windowMs, now)) };
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

const { POST } = await import("./route");

function submit(fields: Record<string, unknown>, ip = "198.51.100.7") {
  return POST(
    new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-nf-client-connection-ip": ip },
      body: JSON.stringify({ name: "Sam", email: "sam@example.com", message: "Hello", ...fields }),
    }),
  );
}

describe("POST /api/contact honeypot", () => {
  beforeEach(() => insert.mockClear());

  it("saves a message when the hidden field is empty", async () => {
    const res = await submit({ _honey: "" });
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
  });

  it("answers success but saves nothing when a bot fills the hidden field", async () => {
    const res = await submit({ _honey: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact rate limit", () => {
  it("refuses a sixth message from the same IP within the hour", async () => {
    for (let i = 0; i < 5; i++) expect((await submit({}, "203.0.113.50")).status).toBe(200);
    const res = await submit({}, "203.0.113.50");
    expect(res.status).toBe(429);
    expect((await submit({}, "203.0.113.51")).status).toBe(200);
  });
});

describe("POST /api/contact when the rate limit can't be checked", () => {
  it("asks to try again in a few minutes instead of saying too many messages, and saves nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    limiter.down = true;
    insert.mockClear();
    const res = await submit({}, "203.0.113.50");
    limiter.down = false;
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("We couldn't send your message right now. Try again in a few minutes, or email us directly.");
    expect(insert).not.toHaveBeenCalled();
  });
});
