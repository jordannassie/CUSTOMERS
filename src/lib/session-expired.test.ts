import { afterEach, describe, expect, it, vi } from "vitest";
import { appFetch, expiredLoginPath } from "./session-expired";

describe("expired session", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the user to log in and back to the same page", () => {
    expect(expiredLoginPath("/competitors?tab=manage")).toBe("/login?next=%2Fcompetitors%3Ftab%3Dmanage&reason=expired");
    expect(expiredLoginPath("//evil.example")).toBe("/login?next=%2Fdashboard&reason=expired");
  });

  it("redirects on a 401 from our API and not on other errors", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/sources", search: "", assign } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    await appFetch("/api/x");
    expect(assign).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    await appFetch("/api/x");
    expect(assign).toHaveBeenCalledWith("/login?next=%2Fsources&reason=expired");
  });
});
