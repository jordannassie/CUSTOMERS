import { describe, expect, it, vi } from "vitest";

// The in-process worker is for local dev only: a stray WORKER_IN_PROCESS in production must not run scans in a request.
const fake = vi.hoisted(() => ({ WORKER_IN_PROCESS: "true" as string | undefined, NODE_ENV: "development" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key in fake ? fake[key as keyof typeof fake] : Reflect.get(t, key)) }) };
});

const { runWorkerInProcess } = await import("./dal");

describe("runWorkerInProcess", () => {
  it("is on only with the flag and outside production", () => {
    fake.WORKER_IN_PROCESS = "true";
    fake.NODE_ENV = "development";
    expect(runWorkerInProcess()).toBe(true);
    fake.NODE_ENV = "production";
    expect(runWorkerInProcess()).toBe(false);
    fake.NODE_ENV = "development";
    fake.WORKER_IN_PROCESS = undefined;
    expect(runWorkerInProcess()).toBe(false);
  });
});
