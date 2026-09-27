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

function submit(fields: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
