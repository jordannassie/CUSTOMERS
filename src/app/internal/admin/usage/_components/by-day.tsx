import { cn } from "cn";
import type { UsageCostReport } from "@/modules/admin";
import { count, money, shortDay } from "./format";

/** Credits used per day as columns; real cost per day is in each column's label and in the table below. */
export default function ByDay({ days }: { days: UsageCostReport["byDay"] }) {
  const max = Math.max(1, ...days.map((d) => d.credits));
  const labelEvery = Math.ceil(days.length / 8);

  return (
    <section aria-labelledby="by-day" className="rounded-md border border-border bg-surface p-5">
      <h2 id="by-day" className="text-[16px] font-semibold">
        By day
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Credits used each day (UTC).</p>

      <div aria-hidden className="mt-5 flex h-40 items-end gap-px sm:gap-0.5">
        {days.map((d) => (
          <div key={d.day} title={`${shortDay(d.day)}: ${count(d.credits)} credits, ${money(d.costUsd)} real cost`} className="flex h-full flex-1 items-end">
            <div
              className={cn("w-full rounded-t-xs", d.credits > 0 ? "bg-primary" : "bg-muted")}
              style={{ height: d.credits > 0 ? `${Math.max((d.credits / max) * 100, 2)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-2 flex gap-px text-[12px] text-hint sm:gap-0.5">
        {days.map((d, i) => (
          <span key={d.day} className="tabular flex-1 overflow-visible whitespace-nowrap">
            {i % labelEvery === 0 ? shortDay(d.day) : ""}
          </span>
        ))}
      </div>

      <details className="mt-4 text-[13px]">
        <summary className="cursor-pointer font-medium text-primary hover:underline">Show as a table</summary>
        <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-border">
          <table className="w-full">
            <thead className="sticky top-0 bg-muted text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">Credits used</th>
                <th className="px-3 py-2 text-right font-medium">Real AI cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...days].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="tabular px-3 py-2">{shortDay(d.day)}</td>
                  <td className="tabular px-3 py-2 text-right">{count(d.credits)}</td>
                  <td className="tabular px-3 py-2 text-right">{money(d.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
