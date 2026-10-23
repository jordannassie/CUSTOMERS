import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const signOut = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut } }) }));

const { POST } = await import("./route");

describe("POST /auth/signout", () => {
  it("signs out and opens the login page with a GET (303), never a blank page", async () => {
    const response = await POST(new NextRequest("https://example.test/auth/signout", { method: "POST" }));
    expect(signOut).toHaveBeenCalledTimes(1);
    // A 307 kept the POST, and a POST to /login answered with an empty page (2026-10-23).
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.test/login");
  });
});
