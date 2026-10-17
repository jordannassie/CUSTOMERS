// Google Places and Firecrawl answers that say "busy": tried once more, then reported as the source being down.
import { describe, expect, it, vi } from "vitest";
import { createFirecrawlScraper } from "./firecrawl";
import { createPlaceLookup, createPlacesSearch } from "./places";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("a busy answer is tried once more (2026-10-14)", () => {
  it("retries a 429 or 5xx once, then gives up; a 404 or 403 is never retried", async () => {
    const busyThenOk = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({ places: [] }));
    await expect(createPlacesSearch("k", { fetch: busyThenOk, retryDelayMs: 0 })("Sunrise Coffee")).resolves.toEqual([]);
    expect(busyThenOk).toHaveBeenCalledTimes(2);

    const alwaysBusy = vi.fn<typeof globalThis.fetch>(async () => json({}, 429));
    await expect(createPlacesSearch("k", { fetch: alwaysBusy, retryDelayMs: 0 })("Sunrise Coffee")).rejects.toThrow("Places returned 429");
    expect(alwaysBusy).toHaveBeenCalledTimes(2);

    const missing = vi.fn<typeof globalThis.fetch>(async () => json({}, 404));
    await expect(createPlaceLookup("k", { fetch: missing, retryDelayMs: 0 })("ChIJ-x")).resolves.toBeNull();
    expect(missing).toHaveBeenCalledTimes(1);
  });

  it("marks a page Firecrawl itself refused, after its one retry, as the reader being down", async () => {
    const quota = vi.fn<typeof globalThis.fetch>(async () => json({ success: false, error: "Rate limit exceeded" }, 429));
    const pages = await createFirecrawlScraper("fc-test", { fetch: quota, retryDelayMs: 0 })("sunrise-coffee.example");
    expect(pages.every((p) => p.status === "failed" && p.readerDown)).toBe(true);
  });
});
