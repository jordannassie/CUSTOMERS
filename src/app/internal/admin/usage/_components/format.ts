export function money(value: number | null): string {
  if (value === null) return "";
  // Per-check costs are fractions of a cent.
  return `$${value.toFixed(value !== 0 && Math.abs(value) < 1 ? 4 : 2)}`;
}

export function percent(value: number | null): string {
  return value === null ? "" : `${Math.round(value * 100)}%`;
}

export function count(value: number): string {
  return value.toLocaleString("en-US");
}

export function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
