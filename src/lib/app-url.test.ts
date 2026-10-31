import { afterEach, describe, expect, it, vi } from "vitest";

// appUrl (BUG-283): the configured address, never a request header; the dev server's own address only in development.
const fake = vi.hoisted(() => ({
  env: {} as { NODE_ENV?: string; PORT?: number; NEXT_PUBLIC_APP_URL?: string; NEXT_PUBLIC_SITE_URL?: string },
}));
vi.mock("./env", () => ({ env: new Proxy({}, { get: (_t, key: string) => fake.env[key as keyof typeof fake.env] }) }));

const { appUrl } = await import("./app-url");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("appUrl in production", () => {
  it("uses NEXT_PUBLIC_APP_URL, then NEXT_PUBLIC_SITE_URL, with no trailing slash", () => {
    fake.env = { NODE_ENV: "production", PORT: 3000, NEXT_PUBLIC_APP_URL: "https://app.example/", NEXT_PUBLIC_SITE_URL: "https://site.example" };
    expect(appUrl()).toBe("https://app.example");
    fake.env = { NODE_ENV: "production", PORT: 3000, NEXT_PUBLIC_SITE_URL: "https://site.example//" };
    expect(appUrl()).toBe("https://site.example");
  });

  it("throws when neither is set, and never falls back to the port or the page's address", () => {
    fake.env = { NODE_ENV: "production", PORT: 3000 };
    vi.stubGlobal("window", { location: { origin: "https://preview--other.netlify.app" } });
    expect(() => appUrl()).toThrow(/NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL/);
  });
});

describe("appUrl in development", () => {
  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    fake.env = { NODE_ENV: "development", PORT: 3107, NEXT_PUBLIC_APP_URL: "http://localhost:3000" };
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("else the dev server's own address, so a session on another port comes back to itself", () => {
    fake.env = { NODE_ENV: "development", PORT: 3107, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };
    expect(appUrl()).toBe("http://localhost:3107");
    vi.stubGlobal("window", { location: { origin: "http://localhost:3108" } });
    expect(appUrl()).toBe("http://localhost:3108");
  });

  it("else NEXT_PUBLIC_SITE_URL, and throws with nothing at all", () => {
    fake.env = { NODE_ENV: "test", NEXT_PUBLIC_SITE_URL: "http://localhost:3000/" };
    expect(appUrl()).toBe("http://localhost:3000");
    fake.env = { NODE_ENV: "test" };
    expect(() => appUrl()).toThrow();
  });
});
