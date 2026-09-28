import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: () => ({ insert }) }),
}));
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
