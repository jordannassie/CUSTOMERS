const DAY = 24 * 60 * 60 * 1000;

/** When a deleted account or business is removed for good. */
export function purgeDate(now: Date, waitDays: number): Date {
  return new Date(now.getTime() + waitDays * DAY);
}

/** The typed confirmation must be the exact name; spaces around it and doubled inside it are forgiven. */
export function confirmsName(typed: string, name: string): boolean {
  const clean = (s: string) => s.trim().replace(/\s+/g, " ");
  return clean(name) !== "" && clean(typed) === clean(name);
}

/** "October 31, 2026", the way emails and the settings page show dates. */
export function longDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const accountDeletedKey = (agencyId: string) => `account_deleted:${agencyId}`;
export const accountRestoredKey = (agencyId: string, at: Date) => `account_restored:${agencyId}:${at.toISOString()}`;
export const accountPurgedKey = (agencyId: string) => `account_purged:${agencyId}`;
export const businessDeletedKey = (businessId: string) => `business_deleted:${businessId}`;

/** Supabase auth error codes the password and email forms answer in plain words. */
export function authUpdateError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "same_password":
      return "That is your current password. Choose a new one.";
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, not a common one.";
    case "email_exists":
      return "Another account already uses that email.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many tries. Wait a minute and try again.";
    case "reauthentication_not_valid":
      return "That code didn't work. Check the latest email from us and try again.";
    default:
      return fallback;
  }
}
