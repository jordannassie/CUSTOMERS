import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ nodeEnv: "development" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, k) => (k === "NODE_ENV" ? state.nodeEnv : Reflect.get(t, k)) }) };
});
const handleWorkerRequest = vi.hoisted(() => vi.fn(async () => Response.json({ error: "Unauthorized" }, { status: 401 })));
vi.mock("@/modules/jobs/server", () => ({ handleWorkerRequest }));

const { POST } = await import("./route");

// The local scan worker route the local Vault points at (scripts/dev/setup-local-vault.sql).
describe("the local scan worker route", () => {
  afterEach(() => {
    state.nodeEnv = "development";
    handleWorkerRequest.mockClear();
  });

  it("hands the request to the worker, which checks the secret", async () => {
    const res = await POST(new Request("http://x/api/dev/scan-worker", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(handleWorkerRequest).toHaveBeenCalledOnce();
  });

  it("does not exist on a production build", async () => {
    state.nodeEnv = "production";
    const res = await POST(new Request("http://x/api/dev/scan-worker", { method: "POST", headers: { "x-worker-secret": "anything" } }));
    expect(res.status).toBe(404);
    expect(handleWorkerRequest).not.toHaveBeenCalled();
  });
});
