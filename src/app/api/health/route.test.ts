import { beforeEach, describe, expect, it, vi } from "vitest";

const pingDatabase = vi.fn<() => Promise<boolean>>();
vi.mock("@/modules/system-status", () => ({ pingDatabase }));
vi.mock("next/server", () => ({ connection: async () => {} }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => pingDatabase.mockReset());

  it("answers 200 and ok true when the database answers", async () => {
    pingDatabase.mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 and ok false when it does not, with nothing else in the body", async () => {
    pingDatabase.mockResolvedValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
  });
});
