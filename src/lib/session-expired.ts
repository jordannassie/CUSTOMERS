import { loginPathFor } from "@/lib/safe-next";

/** Login page that brings the user back to `current` and says why they are there (REL-08). */
export function expiredLoginPath(current: string): string {
  return `${loginPathFor(current)}&reason=expired`;
}

export function sendToLogin(): void {
  window.location.assign(expiredLoginPath(window.location.pathname + window.location.search));
}

/** fetch for our own API routes from the browser: a 401 means the session ended, so go log in. */
export async function appFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) sendToLogin();
  return res;
}
