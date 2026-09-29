const PAUSED_STATUSES = new Set(["suspended", "deleted"]);

export const PAUSED_PATH = "/account-paused";

export function isAgencyPaused(status: string): boolean {
  return PAUSED_STATUSES.has(status);
}

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null, adminEmails: string[]): boolean {
  return !!email && adminEmails.includes(email.toLowerCase());
}

