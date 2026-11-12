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

/**
 * Money as admins read it: always 2 decimals ("$1,234.50", "$0.48"), and "Under $0.01" for a non-zero amount that
 * would round to $0.00 (admin audit 2026-11-12: one page mixed "$1.27" with "$0.9581"). Per-check and per-credit
 * prices use `unitPrice`.
 */
export function money(value: number | null): string {
  if (value === null) return "";
  if (value !== 0 && Math.abs(value) < 0.005) return value < 0 ? "-Under $0.01" : "Under $0.01";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A price for one check or one credit, where fractions of a cent matter: "$0.0042", "$0.0900". */
export function unitPrice(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** "1 agency", "3 agencies": the count with the right word. */
export function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** The singular of the plural nouns admin lists use ("agencies" to "agency", "businesses" to "business"). */
export function singular(noun: string): string {
  if (noun.endsWith("ies")) return `${noun.slice(0, -3)}y`;
  if (noun.endsWith("sses")) return noun.slice(0, -2);
  if (noun.endsWith("s")) return noun.slice(0, -1);
  return noun;
}
