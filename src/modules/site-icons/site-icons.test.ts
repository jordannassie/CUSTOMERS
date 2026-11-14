import { describe, expect, it } from "vitest";
import { iconHost, iconQuery } from "./schema";
import { fetchSiteIcon } from "./service";

describe("iconQuery", () => {
  it("takes a bare host, a URL or www., and keeps one lower-case host", () => {
    expect(iconHost("https://www.Yelp.com/biz/bean-house?x=1")).toBe("yelp.com");
    expect(iconQuery.parse({ domain: "WWW.rtings.com" }).domain).toBe("rtings.com");
    expect(iconQuery.parse({ domain: "sub.example.co.uk:443" }).domain).toBe("sub.example.co.uk");
  });

  it("refuses what is not a website address", () => {
    for (const domain of ["", "localhost", "not a site", "javascript:alert(1)", "127.0.0.1", "a".repeat(300) + ".com"]) {
      expect(iconQuery.safeParse({ domain }).success, domain).toBe(false);
    }
  });
});

describe("fetchSiteIcon", () => {
  const png = () => new Response(new Uint8Array(600), { headers: { "content-type": "image/png" } });
  const notFound = () => new Response(new Uint8Array(600), { status: 404, headers: { "content-type": "image/png" } });
  const by = (google: () => Response | Promise<Response>, duck: () => Response | Promise<Response>) =>
    (async (url: string) => (url.includes("google.com") ? google() : duck())) as unknown as typeof fetch;
  const noSite = async () => "none" as const;
  const dropped = () => {
    throw new TypeError("fetch failed");
  };

  it("asks Google and DuckDuckGo, and prefers Google's icon", async () => {
    const asked: string[] = [];
    const icon = await fetchSiteIcon("yelp.com", (async (url: string) => (asked.push(url), png())) as unknown as typeof fetch, noSite);
    expect(icon).toMatchObject({ kind: "icon", type: "image/png" });
    expect(asked.sort()).toEqual(["https://icons.duckduckgo.com/ip3/yelp.com.ico", "https://www.google.com/s2/favicons?domain=yelp.com&sz=64"]);
  });

  it("uses DuckDuckGo's icon when Google has none, then the site's own icon when neither has one", async () => {
    expect(await fetchSiteIcon("foodiespakistan.pk", by(notFound, png), noSite)).toMatchObject({ kind: "icon" });
    const own = async () => ({ body: new Uint8Array(10).buffer, type: "image/x-icon" });
    expect(await fetchSiteIcon("dominos.com.pk", by(notFound, notFound), own)).toMatchObject({ kind: "icon", type: "image/x-icon" });
  });

  it("says none only when both services say none and the site has none; any failure is asked again later", async () => {
    expect(await fetchSiteIcon("nosuchsite.com", by(notFound, notFound), noSite)).toEqual({ kind: "none" });
    // A Google timeout must not be remembered as "no icon" (cheezious.com lost its icon for a day that way).
    expect(await fetchSiteIcon("cheezious.com", by(dropped, notFound), noSite)).toEqual({ kind: "failed" });
    expect(await fetchSiteIcon("cheezious.com", by(notFound, dropped), noSite)).toEqual({ kind: "failed" });
    // The site itself timing out is not "no icon" either (dominos.com.pk's icon only comes from its own site).
    expect(await fetchSiteIcon("dominos.com.pk", by(notFound, notFound), async () => "failed" as const)).toEqual({ kind: "failed" });
    expect(await fetchSiteIcon("yelp.com", by(dropped, dropped), noSite)).toEqual({ kind: "failed" });
    expect(await fetchSiteIcon("yelp.com", by(() => new Response("busy", { status: 429, headers: { "content-type": "text/html" } }), dropped), noSite)).toEqual({ kind: "failed" });
  });

  it("never sends something too large as an icon", async () => {
    const huge = () => new Response(new Uint8Array(200_000), { headers: { "content-type": "image/png" } });
    expect(await fetchSiteIcon("yelp.com", by(huge, notFound), noSite)).toEqual({ kind: "none" });
  });
});
