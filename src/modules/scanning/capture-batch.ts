// Charges a scan's finished checks (E2E-0929 BUG-3). Every capture locks the agency row, so one call per check
// queued up to 5 calls per scan on it and passed the statement timeout under load. Here a scan has at most one
// capture call running, and it takes every check that finished while the last call ran.

/** Charges the given checks; returns how many were newly charged. Safe to repeat: each check is charged once. */
export type CaptureChecks = (checkIds: string[]) => Promise<number>;

// A slow or dropped call is tried again: capture is idempotent per check, so a repeat cannot charge twice.
export const CAPTURE_RETRY_MS = [1000, 3000];
const FINAL = /hold_closed|hold_used_up|hold_not_found/;

type Waiting = { checkId: string; resolve: () => void; reject: (err: unknown) => void };

export function captureBatcher(capture: CaptureChecks, wait = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  let queue: Waiting[] = [];
  let busy = false;
  let charged = 0;

  async function withRetry(ids: string[]): Promise<number> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await capture(ids);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt >= CAPTURE_RETRY_MS.length || FINAL.test(message)) throw err;
        await wait(CAPTURE_RETRY_MS[attempt]);
      }
    }
  }

  async function drain() {
    busy = true;
    while (queue.length > 0) {
      const batch = queue;
      queue = [];
      try {
        charged += await withRetry(batch.map((w) => w.checkId));
        batch.forEach((w) => w.resolve());
      } catch (err) {
        batch.forEach((w) => w.reject(err));
      }
    }
    busy = false;
  }

  return {
    /** Resolves once the check is charged (or was already). */
    add(checkId: string): Promise<void> {
      return new Promise((resolve, reject) => {
        queue.push({ checkId, resolve, reject });
        if (!busy) void drain();
      });
    },
    charged: () => charged,
  };
}
