const PAUSED_STATUSES = new Set(["suspended", "deleted"]);

export const PAUSED_PATH = "/account-paused";
export const DELETED_PATH = "/account-deleted";

/** Where a blocked account is sent: a deleted one sees that it was deleted, not that it is paused (B-77). */
export function blockedPathFor(status: string): string {
  return status === "deleted" ? DELETED_PATH : PAUSED_PATH;
}

export function isAgencyPaused(status: string): boolean {
  return PAUSED_STATUSES.has(status);
}

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null, adminEmails: string[], emailConfirmed: boolean): boolean {
  return emailConfirmed && !!email && adminEmails.includes(email.toLowerCase());
}


/** How long after opening a reset link the "Set new password" form stays open. */
export const RECOVERY_WINDOW_SECONDS = 60 * 60;
// A reset link signs in with method "recovery" (code flow) or "otp" (token hash flow).
const RECOVERY_METHODS = new Set(["recovery", "otp"]);

/**
 * True when the session's amr claim shows it came from a reset link opened in the last hour. Only then may the
 * reset page set a password without the old one; any other session changes it in Settings.
 */
export function isRecentRecovery(amr: unknown, nowSeconds: number, windowSeconds = RECOVERY_WINDOW_SECONDS): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    if (!entry || typeof entry !== "object") return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return (
      typeof method === "string" &&
      RECOVERY_METHODS.has(method) &&
      typeof timestamp === "number" &&
      timestamp <= nowSeconds + 60 &&
      nowSeconds - timestamp <= windowSeconds
    );
  });
}
