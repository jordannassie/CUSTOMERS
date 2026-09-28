export type Revenue =
  | { state: "not_connected" }
  | { state: "error" }
  | { state: "ok"; cents: number; mode: "stripe" | "fixture" };

/** Share of revenue spent on AI calls (0.12 = 12 cents per dollar), or null when there is no revenue to compare. */
export function aiCostShare(costUsd: number, revenue: Revenue): number | null {
  if (revenue.state !== "ok" || revenue.cents <= 0) return null;
  return costUsd / (revenue.cents / 100);
}

// Open alerts arrive with B-69; until then the Overview shows an empty list in this shape.
export type OpenAlert = { id: string; severity: "info" | "warning" | "critical"; message: string; createdAt: string };
export const openAlertsPlaceholder = (): OpenAlert[] => [];
