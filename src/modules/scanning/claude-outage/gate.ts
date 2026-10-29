// One scan's view of the Claude outage (outage.ts): which Claude checks to leave out, and when to mark Claude
// unavailable or back. The first auth or credit failure marks it once and skips the Claude checks not yet started;
// in a probe, the first new Claude answer closes the outage. A server error, timeout, network error or rate limit
// marks Claude "down" only when it fails the probe or every Claude check of the scan (finish), never one check alone.
import type { CheckOutcome, CheckTask } from "../check";
import { providerDown } from "../providers/request";
import type { ClaudeMode, OutageReason, OutageStore } from "./outage";

export type ClaudeGate = {
  /** True while a probe is still waiting for a Claude check that settles it. */
  probing(): boolean;
  /** True when this Claude check must not run; counts it as skipped. */
  skip(task: CheckTask): boolean;
  /** Records what a Claude check that ran (fresh: not reused from earlier in this job) says about Claude. */
  after(task: CheckTask, outcome: CheckOutcome, fresh: boolean): Promise<void>;
  /** Once every check has run: marks Claude "down" when each Claude check that ran failed as not answering. */
  finish(): Promise<void>;
  skipped(): number;
};

/** `openReason`: why the open outage started, kept when a probe finds Claude still not answering. */
export function claudeGate(store: OutageStore, mode: ClaudeMode, openReason: OutageReason | null = null): ClaudeGate {
  let down = mode === "skip";
  let probing = mode === "probe";
  let skipped = 0;
  let ran = 0;
  let notAnswering = 0;
  let lastDown = "";
  const markDown = async (reason: OutageReason, detail: string) => {
    down = true;
    await store.mark(reason, detail);
  };
  return {
    probing: () => probing,
    skip(task) {
      if (task.provider !== "anthropic" || !down) return false;
      skipped++;
      return true;
    },
    async after(task, outcome, fresh) {
      if (task.provider !== "anthropic") return;
      const failedDown = !outcome.ok && outcome.kind !== undefined && providerDown(outcome.kind);
      if (fresh) ran++;
      if (fresh && !outcome.ok && failedDown) {
        notAnswering++;
        lastDown = outcome.reason;
      }
      if (!outcome.ok && outcome.outage) {
        probing = false;
        if (!down) await markDown(outcome.outage, outcome.reason);
        return;
      }
      // A cached answer says nothing about the key: the probe goes on to the next Claude check.
      if (!probing || !fresh || (outcome.ok && outcome.cached)) return;
      probing = false;
      if (outcome.ok) return store.clear();
      // Still not answering after the window: the outage stays open for another window and this scan leaves Claude
      // out too (BUG-285). Any other failure (a bad request) proves nothing, so this scan asks Claude as usual.
      if (failedDown) await markDown(openReason ?? "down", outcome.reason);
    },
    async finish() {
      // Already marked or left out from the start, nothing ran, or some Claude check answered or failed otherwise.
      if (down || ran === 0 || notAnswering < ran) return;
      await markDown("down", lastDown);
    },
    skipped: () => skipped,
  };
}
