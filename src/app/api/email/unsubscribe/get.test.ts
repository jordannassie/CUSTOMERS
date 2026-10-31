import { describe, expect, it, vi } from "vitest";

// The List-Unsubscribe address opened in a browser (B-61, RFC 8058): no database, since a visit changes nothing.
const unsubscribeAgency = vi.hoisted(() => vi.fn());
vi.mock("@/modules/email", () => ({ readUnsubscribeToken: vi.fn(), unsubscribeAgency }));

const { GET } = await import("./route");

describe("GET /api/email/unsubscribe", () => {
  it("sends the visit to the confirm page with its token and unsubscribes nothing", async () => {
    const res = await GET(new Request("http://app.test/api/email/unsubscribe?token=abc.def"));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/email/unsubscribe");
    expect(location.searchParams.get("token")).toBe("abc.def");
    expect(location.searchParams.has("done")).toBe(false);
    expect(unsubscribeAgency).not.toHaveBeenCalled();
  });

  it("goes to the page without a token when the link has none", async () => {
    const res = await GET(new Request("http://app.test/api/email/unsubscribe"));
    expect(new URL(res.headers.get("location") ?? "").search).toBe("");
  });
});
