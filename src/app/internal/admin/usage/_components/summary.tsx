import { cn } from "cn";
import type { UsageCostReport } from "@/modules/admin";
import { StatGrid, StatTile } from "../../_components/stat";
import { count, money, percent, plural, unitPrice } from "./format";

/**
 * The period's totals. Margin is shown two ways (admin audit 2026-11-12): on paid checks alone, and after all AI cost.
 * Free trial credits and other AI work (explanations, auto-fill) cost us but bring in nothing, so one -346% next to
 * every model "Profitable" read as a contradiction with no word of why.
 */
export default function Summary({ report }: { report: UsageCostReport }) {
  const { totals, creditPriceUsd } = report;
  const paid = totals.credits - totals.freeCredits;
  const restCost = Math.max(0, totals.costUsd - totals.paidCheckCostUsd);
  const lossAfterAll = totals.margin !== null && totals.margin < 0;

  return (
    <div className="flex flex-col gap-2">
      {/* 5 tiles: on phones (2 across) and tablets (3 across) the last one fills the row, so no empty grey cell. */}
      <div className="[&>dl>div:last-child]:col-span-2 lg:[&>dl>div:last-child]:col-span-1">
        <StatGrid label="Totals for the period" columns={5}>
          <StatTile
            label="Credits used"
            value={count(totals.credits)}
            note={totals.freeCredits > 0 ? `${count(totals.freeCredits)} of them free` : undefined}
          />
          <StatTile
            label="Real AI cost"
            value={money(totals.costUsd)}
            note={
              <>
                <span className="block">Paid checks, estimated: {money(totals.paidCheckCostUsd)}</span>
                <span className="block">Free trials and other AI work: {money(restCost)}</span>
              </>
            }
          />
          <StatTile
            label="Value of paid credits used"
            value={creditPriceUsd === null ? "-" : money(paid * creditPriceUsd)}
            note={creditPriceUsd === null ? "No plan has a price yet" : `At the lowest price, ${unitPrice(creditPriceUsd)} a credit`}
          />
          <StatTile
            label="Margin on paid checks"
            value={percent(totals.paidMargin) || "-"}
            tone={totals.paidMargin !== null && totals.paidMargin < 0 ? "bad" : undefined}
            note={
              totals.margin === null ? (
                "No paid credits in this period"
              ) : (
                <>
                  After all AI cost: <span className={cn(lossAfterAll && "font-medium text-mid-text")}>{percent(totals.margin)}</span>
                </>
              )
            }
          />
          <StatTile
            label="Answered from cache"
            value={percent(totals.cacheHitRate) || "-"}
            note={`${count(totals.cached)} of ${plural(totals.checks, "check", "checks")}, no credit charged`}
          />
        </StatGrid>
      </div>
      {totals.margin !== null && (
        <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">
          Margin on paid checks compares paid credits with what their checks cost us. That cost is an estimate: each paid
          credit at the average cost of a check by that AI in the period, so it can differ a little between periods. After
          all AI cost also counts free trial checks and other AI work, which bring in nothing.
        </p>
      )}
    </div>
  );
}
