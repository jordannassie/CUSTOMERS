import { describe, expect, it, vi } from "vitest";
import type { CheckOutcome, CheckTask } from "../check";
import type { ProviderErrorKind } from "../providers/request";
import type { ProviderId } from "../providers/types";
import { claudeGate } from "./gate";
import type { OutageStore } from "./outage";

// BUG-285: one scan's view of Claude. A server error, timeout, network error or rate limit on one check never switches
// Claude off; every Claude check of the scan failing that way does, and so does a failed probe.
const store = () => ({ read: vi.fn(async () => null), mark: vi.fn(async () => {}), clear: vi.fn(async () => {}) }) satisfies OutageStore;
const task = (provider: ProviderId = "anthropic"): CheckTask => ({ checkId: "c", promptId: "p", provider, question: "q" });
const ok: CheckOutcome = { ok: true, cached: false };
const failed = (kind: ProviderErrorKind, reason = `anthropic ${kind}`): CheckOutcome => ({ ok: false, error: reason, reason, kind });

describe("claudeGate", () => {
  it("marks Claude down at the end when every Claude check that ran was not answering", async () => {
    const s = store();
    const gate = claudeGate(s, "use");
    await gate.after(task(), failed("server"), true);
    await gate.after(task(), failed("timeout", "anthropic did not answer"), true);
    // Other models do not count either way.
    await gate.after(task("openai"), ok, true);
    expect(s.mark).not.toHaveBeenCalled();

    await gate.finish();
    expect(s.mark).toHaveBeenCalledTimes(1);
    expect(s.mark).toHaveBeenCalledWith("down", "anthropic did not answer");
  });

  it("does not mark Claude down when one Claude check answered or failed for another reason", async () => {
    for (const other of [ok, { ok: true, cached: true } as const, failed("client"), failed("search")]) {
      const s = store();
      const gate = claudeGate(s, "use");
      await gate.after(task(), failed("server"), true);
      await gate.after(task(), other, true);
      await gate.finish();
      expect(s.mark).not.toHaveBeenCalled();
    }
  });

  it("does nothing at the end when no Claude check ran, or only saved ones", async () => {
    const s = store();
    await claudeGate(s, "use").finish();
    const gate = claudeGate(s, "use");
    await gate.after(task(), ok, false);
    await gate.finish();
    await claudeGate(s, "skip").finish();
    expect(s.mark).not.toHaveBeenCalled();
  });

  it("marks once when an auth failure already marked Claude during the scan", async () => {
    const s = store();
    const gate = claudeGate(s, "use");
    await gate.after(task(), { ok: false, error: "401", reason: "401", outage: "auth", kind: "client" }, true);
    await gate.after(task(), failed("server"), true);
    await gate.finish();
    expect(s.mark).toHaveBeenCalledTimes(1);
    expect(s.mark).toHaveBeenCalledWith("auth", "401");
  });

  it("keeps Claude out after a probe that is still not answering, with the outage's own reason", async () => {
    const s = store();
    const gate = claudeGate(s, "probe", "credit");
    await gate.after(task(), failed("server", "anthropic returned 529"), true);
    expect(gate.probing()).toBe(false);
    expect(gate.skip(task())).toBe(true);
    expect(s.mark).toHaveBeenCalledWith("credit", "anthropic returned 529");
    await gate.finish();
    expect(s.mark).toHaveBeenCalledTimes(1);
  });

  it("marks a probe that is still not answering as down when the reason is not known", async () => {
    const s = store();
    await claudeGate(s, "probe").after(task(), failed("network"), true);
    expect(s.mark).toHaveBeenCalledWith("down", "anthropic network");
  });

  it("asks Claude as usual after a probe that failed for another reason", async () => {
    const s = store();
    const gate = claudeGate(s, "probe", "down");
    await gate.after(task(), failed("client"), true);
    expect(gate.probing()).toBe(false);
    expect(gate.skip(task())).toBe(false);
    expect(s.mark).not.toHaveBeenCalled();
    expect(s.clear).not.toHaveBeenCalled();
  });
});
