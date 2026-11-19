// Small helpers for running a scan's checks: a bounded pool, and one line that sums up the errors.

/** Each distinct error once, with how many checks it hit. */
export function summarise(errors: string[]): string {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts]
    .map(([e, n]) => (n > 1 ? `${e} (${n} checks)` : e))
    .join("; ")
    .slice(0, 1000);
}

// After a failure no new item starts, and the error is thrown only once the running ones end: the worker must
// not requeue a job whose checks are still running.
export async function forEachLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const failures: unknown[] = [];
  const worker = async () => {
    while (failures.length === 0 && next < items.length) {
      try {
        await fn(items[next++]);
      } catch (error) {
        failures.push(error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (failures.length > 0) throw failures[0];
}
