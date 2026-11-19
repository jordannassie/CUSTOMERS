import type { UsageCostReport } from "@/modules/admin";
import { StatGrid, StatTile } from "../../_components/stat";
import { count, money, percent, plural, unitPrice } from "./format";

/**
 * The period's totals, one short note each (owner, 2026-11-18: the page explained everything twice, and "After all AI
 * cost: -67%" compared all AI cost with only the paid credits used, so it read as a loss while What we keep showed 97%).
 * What the business keeps is the What we keep card below; the margin here is the one on paid checks only.
 */
export default function Summary({ report }: { report: UsageCostReport }) {
  const { totals, creditPriceUsd } = report;
  const paid = totals.credits - totals.freeCredits;

  return (
    // 5 tiles: on phones (2 across) and tablets (3 across) the last one fills the row, so no empty grey cell.
    <div className="[&>dl>div:last-child]:col-span-2 lg:[&>dl>div:last-child]:col-span-1">
      <StatGrid label="Totals for the period" columns={5}>
        <StatTile label="Credits used" value={count(totals.credits)} note={totals.freeCredits > 0 ? `${count(totals.freeCredits)} free` : undefined} />
        <StatTile label="AI cost" value={money(totals.costUsd)} note={`${money(totals.paidCheckCostUsd)} on paid checks`} />
        <StatTile
          label="Paid credits worth"
          value={creditPriceUsd === null ? "-" : money(paid * creditPriceUsd)}
          note={creditPriceUsd === null ? "No plan has a price yet" : `At ${unitPrice(creditPriceUsd)} a credit`}
        />
        <StatTile
          label="Margin on paid checks"
          value={percent(totals.paidMargin) || "-"}
          tone={totals.paidMargin !== null && totals.paidMargin < 0 ? "bad" : undefined}
          note={totals.paidMargin === null ? "No paid credits yet" : undefined}
        />
        <StatTile label="From cache" value={percent(totals.cacheHitRate) || "-"} note={`${count(totals.cached)} of ${plural(totals.checks, "check", "checks")}, free`} />
      </StatGrid>
    </div>
  );
}
