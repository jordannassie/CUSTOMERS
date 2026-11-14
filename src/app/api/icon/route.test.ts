import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const requireUser = vi.fn(async () => ({ id: "u1" }));
const checkRateLimit = vi.fn(async () => "allowed" as const);
const fetchSiteIcon = vi.fn();
vi.mock("@/modules/auth", () => ({ requireUser }));
vi.mock("@/modules/rate-limit", () => ({ checkRateLimit }));
vi.mock("@/modules/site-icons", async () => {
  const schema = await import("@/modules/site-icons/schema");
  const memo = await import("@/modules/site-icons/memo");
  return { iconQuery: schema.iconQuery, keepIcon: memo.keepIcon, keptIcon: memo.keptIcon, fetchSiteIcon };
});

const { GET } = await import("./route");
const { clearKeptIcons } = await import("@/modules/site-icons/memo");

const ask = (domain: string) => GET({ nextUrl: new URL(`https://app.test/api/icon?domain=${domain}`) } as NextRequest);
const png = () => ({ kind: "icon" as const, body: new Uint8Array([1, 2, 3]).buffer, type: "image/png" });

beforeEach(() => {
  clearKeptIcons();
  requireUser.mockClear();
  checkRateLimit.mockClear();
  fetchSiteIcon.mockReset().mockResolvedValue(png());
});

describe("GET /api/icon (perf plan #6)", () => {
  it("fetches an icon once, then answers from memory without the allowance check or outside requests", async () => {
    const first = await ask("yelp.com");
    const second = await ask("yelp.com");

    expect(fetchSiteIcon).toHaveBeenCalledTimes(1);
    expect(checkRateLimit).toHaveBeenCalledTimes(1);
    expect(requireUser).toHaveBeenCalledTimes(2);
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(second.headers.get("cache-control")).toMatch(/^private/);
  });

  it("still refuses a signed-out request, even for an icon in memory", async () => {
    await ask("yelp.com");
    requireUser.mockRejectedValueOnce(new Error("not signed in"));
    expect((await ask("yelp.com")).status).toBe(401);
  });

  it("asks again after a failed fetch instead of remembering it", async () => {
    fetchSiteIcon.mockResolvedValueOnce({ kind: "failed" });
    expect((await ask("down.example")).status).toBe(204);
    await ask("down.example");
    expect(fetchSiteIcon).toHaveBeenCalledTimes(2);
  });
});
