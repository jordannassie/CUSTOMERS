export { money } from "../../_components/format";

export function percent(value: number | null): string {
  return value === null ? "" : `${Math.round(value * 100)}%`;
}

export function count(value: number): string {
  return value.toLocaleString("en-US");
}

export function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
