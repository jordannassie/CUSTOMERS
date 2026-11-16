// Alerts that close themselves once the problem is gone (admin request, 2026-11-16). Service alerts already do this
// through the System status check (serviceAlertChanges); these are raised by failures, so nothing closed them:
// - Claude fell back to ChatGPT, was unavailable or out of credit: closed once a real Claude check succeeded after the
//   alert was last seen, so Claude is answering again.
// - Hourly spikes (AI tool errors, failed scans, webhook failures): closed after a day with nothing new. If the problem
//   comes back, the next alert check opens a new one.
// Every other kind stays until an admin resolves it. Pure.

export const CLAUDE_KINDS = ["ai_fallback", "claude_unavailable", "anthropic_credit"] as const;
export const QUIET_KINDS = ["provider_errors", "failed_scans", "webhook_failures"] as const;
export const QUIET_FOR_MS = 24 * 60 * 60 * 1000;

export type OpenAlert = { id: string; kind: string; last_seen_at: string };

/** The ids of open alerts to close now. `claudeWorkedAt`: the newest successful live Claude check, or null. */
export function recoveredAlertIds(open: OpenAlert[], claudeWorkedAt: string | null, now: Date): string[] {
  return open
    .filter((a) => {
      const lastSeen = Date.parse(a.last_seen_at);
      if ((CLAUDE_KINDS as readonly string[]).includes(a.kind)) return claudeWorkedAt !== null && Date.parse(claudeWorkedAt) > lastSeen;
      if ((QUIET_KINDS as readonly string[]).includes(a.kind)) return now.getTime() - lastSeen >= QUIET_FOR_MS;
      return false;
    })
    .map((a) => a.id);
}
