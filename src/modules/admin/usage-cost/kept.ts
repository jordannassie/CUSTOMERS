import { SERVICE_LABELS, SERVICE_PROVIDERS, type ServiceKey } from "@/modules/service-costs";
import type { UsageRow } from "./service";

// What we keep in a period (owner, 2026-11-17): the money Stripe collected, less Stripe's fees, the AI tools and the
// other paid services (Google Places, Firecrawl). The AI totals elsewhere on the page stay AI only. Pure.

export type ServiceCost = { key: ServiceKey; label: string; costUsd: number; calls: number };

/** A cost row of a paid service that is not an AI tool. */
export const isServiceRow = (u: Pick<UsageRow, "provider">) => u.provider !== null && SERVICE_PROVIDERS.has(u.provider);

/** Each service's cost and calls in the period, in a fixed order so the card never jumps. */
export function serviceCosts(usage: UsageRow[]): ServiceCost[] {
  return (["google_places", "firecrawl"] as const).map((key) => {
    const rows = usage.filter((u) => u.provider === key);
    return {
      key,
      label: SERVICE_LABELS[key],
      costUsd: rows.reduce((t, u) => t + u.costUsd, 0),
      calls: rows.reduce((t, u) => t + (u.events ?? 1), 0),
    };
  });
}

export type Kept =
  | {
      state: "ok";
      collectedUsd: number;
      charges: number;
      stripeFeesUsd: number;
      aiCostUsd: number;
      servicesUsd: number;
      keptUsd: number;
      /** What we keep over what was collected; null with nothing collected. */
      margin: number | null;
    }
  /** No Stripe key; fixture mode (local and tests) has no real charges to count. */
  | { state: "not_connected" | "fixture" | "error"; aiCostUsd: number; servicesUsd: number };

export function keptOf(collected: { cents: number; feeCents: number; charges: number }, aiCostUsd: number, servicesUsd: number): Kept {
  const collectedUsd = collected.cents / 100;
  const stripeFeesUsd = collected.feeCents / 100;
  const keptUsd = collectedUsd - stripeFeesUsd - aiCostUsd - servicesUsd;
  return {
    state: "ok",
    collectedUsd,
    charges: collected.charges,
    stripeFeesUsd,
    aiCostUsd,
    servicesUsd,
    keptUsd,
    margin: collectedUsd > 0 ? keptUsd / collectedUsd : null,
  };
}
