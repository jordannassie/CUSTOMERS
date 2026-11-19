import { describe, expect, it } from "vitest";
import { buildUrls, fillBuildUrls } from "./build-urls";

// The site URLs at build time (BUG-283): Netlify's own address when unset, and a live build fails without https.

const LIVE = "https://customers.direct";
const PREVIEW = "https://deploy-preview-12--customers-direct.netlify.app";

describe("buildUrls", () => {
  it("fills both from the primary domain on the live site, and from the deploy's address elsewhere on Netlify", () => {
    expect(buildUrls({ CONTEXT: "production", URL: LIVE, DEPLOY_PRIME_URL: PREVIEW })).toEqual({
      NEXT_PUBLIC_SITE_URL: LIVE,
      NEXT_PUBLIC_APP_URL: LIVE,
    });
    for (const CONTEXT of ["deploy-preview", "branch-deploy"]) {
      expect(buildUrls({ CONTEXT, URL: LIVE, DEPLOY_PRIME_URL: PREVIEW })).toEqual({
        NEXT_PUBLIC_SITE_URL: PREVIEW,
        NEXT_PUBLIC_APP_URL: PREVIEW,
      });
    }
  });

  it("keeps values that are set", () => {
    expect(buildUrls({ CONTEXT: "deploy-preview", DEPLOY_PRIME_URL: PREVIEW, NEXT_PUBLIC_SITE_URL: LIVE })).toEqual({
      NEXT_PUBLIC_SITE_URL: LIVE,
      NEXT_PUBLIC_APP_URL: PREVIEW,
    });
  });

  it("changes nothing on a local build, which has no CONTEXT", () => {
    expect(buildUrls({ URL: LIVE, DEPLOY_PRIME_URL: PREVIEW })).toEqual({});
    expect(buildUrls({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toEqual({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
  });

  it("fails a live build with no address or an http one", () => {
    expect(() => buildUrls({ CONTEXT: "production" })).toThrow(/NEXT_PUBLIC_SITE_URL is not set/);
    expect(() => buildUrls({ CONTEXT: "production", URL: "  " })).toThrow(/https/);
    expect(() => buildUrls({ CONTEXT: "production", URL: LIVE, NEXT_PUBLIC_APP_URL: "http://customers.direct" })).toThrow(
      /NEXT_PUBLIC_APP_URL is http:\/\/customers.direct/,
    );
  });
});

describe("fillBuildUrls", () => {
  it("writes only the unset values, so env.ts sees them", () => {
    const target: Record<string, string | undefined> = { CONTEXT: "production", URL: LIVE, NEXT_PUBLIC_APP_URL: "https://app.customers.direct", NEXT_PUBLIC_SITE_URL: "" };
    expect(fillBuildUrls(target)).toEqual({ NEXT_PUBLIC_SITE_URL: LIVE, NEXT_PUBLIC_APP_URL: "https://app.customers.direct" });
    expect(target).toMatchObject({ NEXT_PUBLIC_SITE_URL: LIVE, NEXT_PUBLIC_APP_URL: "https://app.customers.direct" });
  });
});
