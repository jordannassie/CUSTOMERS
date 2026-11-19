export const credits = (n: number) => `${n.toLocaleString("en-US")} credit${n === 1 ? "" : "s"}`;
export const count = (n: number) => n.toLocaleString("en-US");

// UTC so the server render and the ledger's month boundary agree.
export function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function dayAndTime(iso: string, timeZone = "UTC"): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

export function monthName(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}
