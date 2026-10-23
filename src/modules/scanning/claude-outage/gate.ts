// One scan's view of the Claude outage (outage.ts): which Claude checks to leave out, and when to mark Claude
// unavailable or back. The first auth or credit failure marks it once and skips the Claude checks not yet started;
// in a probe, the first new Claude answer closes the outage.
import type { CheckOutcome, CheckTask } from "../check";
import type { ClaudeMode, OutageStore } from "./outage";

export type ClaudeGate = {
  /** True while a probe is still waiting for a Claude check that settles it. */
  probing(): boolean;
  /** True when this Claude check must not run; counts it as skipped. */
  skip(task: CheckTask): boolean;
  /** Records what a Claude check that ran (fresh: not reused from earlier in this job) says about Claude. */
  after(task: CheckTask, outcome: CheckOutcome, fresh: boolean): Promise<void>;
  skipped(): number;
};

export function claudeGate(store: OutageStore, mode: ClaudeMode): ClaudeGate {
  let down = mode === "skip";
  let probing = mode === "probe";
  let skipped = 0;
  return {
    probing: () => probing,
    skip(task) {
      if (task.provider !== "anthropic" || !down) return false;
      skipped++;
      return true;
    },
    async after(task, outcome, fresh) {
      if (task.provider !== "anthropic") return;
      if (!outcome.ok && outcome.outage) {
        probing = false;
        if (down) return;
        down = true;
        await store.mark(outcome.outage, outcome.reason);
        return;
      }
      // A cached answer says nothing about the key: the probe goes on to the next Claude check.
      if (!probing || !fresh || (outcome.ok && outcome.cached)) return;
      // A rate limit or a timeout proves nothing either way: the outage stays open and the next scan probes again,
      // while this one asks Claude as usual.
      probing = false;
      if (outcome.ok) await store.clear();
    },
    skipped: () => skipped,
  };
}
