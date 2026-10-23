// The one date and money format for every admin page. Plain functions, so client and server parts share them.

/**
 * "Oct 14, 2026 UTC", or with the time "Oct 14, 2026, 2:05 PM UTC". UTC, so every admin reads the same time
 * whatever the server's or browser's zone, and always says so (BUG-070).
 */
export function formatDate(iso: string, withTime = false): string {
  const text = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
    timeZone: "UTC",
  });
  return `${text} UTC`;
}

/** "$1,234.50", and 4 decimals under a dollar ("$0.0042"), since a check costs a fraction of a cent. */
export function money(value: number | null): string {
  if (value === null) return "";
  const decimals = value !== 0 && Math.abs(value) < 1 ? 4 : 2;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
