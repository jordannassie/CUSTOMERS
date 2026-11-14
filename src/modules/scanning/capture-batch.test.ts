import { describe, expect, it } from "vitest";
import { captureBatcher, type CaptureChecks } from "./capture-batch";

const noWait = async () => {};

function fakeCapture(fail: (call: number) => Error | null = () => null) {
  const calls: string[][] = [];
  let running = 0;
  let maxRunning = 0;
  const charged = new Set<string>();
  const capture: CaptureChecks = async (ids) => {
    calls.push(ids);
    running++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
    const error = fail(calls.length);
    if (error) throw error;
    const fresh = ids.filter((id) => !charged.has(id));
    fresh.forEach((id) => charged.add(id));
    return fresh.length;
  };
  return { capture, calls, maxRunning: () => maxRunning };
}

describe("captureBatcher (E2E-0929)", () => {
  it("runs one call at a time and sends the checks that finished meanwhile together", async () => {
    const fake = fakeCapture();
    const batcher = captureBatcher(fake.capture, noWait);

    await Promise.all(Array.from({ length: 12 }, (_, i) => batcher.add(`check-${i}`)));

    expect(fake.maxRunning()).toBe(1);
    expect(fake.calls).toEqual([["check-0"], Array.from({ length: 11 }, (_, i) => `check-${i + 1}`)]);
    expect(batcher.charged()).toBe(12);
  });

  it("tries a timed-out call again without charging twice", async () => {
    const fake = fakeCapture((call) => (call === 1 ? new Error("canceling statement due to statement timeout") : null));
    const batcher = captureBatcher(fake.capture, noWait);

    await Promise.all([batcher.add("a"), batcher.add("b")]);

    expect(fake.calls).toEqual([["a"], ["a"], ["b"]]);
    expect(batcher.charged()).toBe(2);
  });

  it("gives up after its retries and fails every check in that call", async () => {
    const fake = fakeCapture(() => new Error("fetch failed"));
    const batcher = captureBatcher(fake.capture, noWait);

    await expect(batcher.add("a")).rejects.toThrow("fetch failed");
    expect(fake.calls).toHaveLength(3);
  });

  it("does not retry a closed or used-up hold", async () => {
    const fake = fakeCapture(() => new Error("capture_credits failed: hold_closed"));
    const batcher = captureBatcher(fake.capture, noWait);

    await expect(batcher.add("a")).rejects.toThrow("hold_closed");
    expect(fake.calls).toHaveLength(1);
  });
});
