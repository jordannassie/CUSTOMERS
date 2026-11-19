// One Checkout Session per payment form (BUG-105). React runs memo callbacks twice in development and again whenever
// a prop changes, and each run made a new Stripe session: the page then paid one session and waited on another
// ("taking longer than usual"). Each form keeps its session per key until it is paid, fails, or is 30 minutes old.

const MAX_AGE_MS = 30 * 60 * 1000;
const sessions = new Map<string, { at: number; promise: Promise<unknown> }>();

export function checkoutOnce<T>(key: string, create: () => Promise<T>): Promise<T> {
  const found = sessions.get(key);
  if (found && Date.now() - found.at < MAX_AGE_MS) return found.promise as Promise<T>;
  const promise = create();
  promise.catch(() => sessions.delete(key));
  sessions.set(key, { at: Date.now(), promise });
  return promise;
}

/** After paying, so the next purchase starts a new session. */
export function forgetCheckout(key: string): void {
  sessions.delete(key);
}
