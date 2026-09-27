import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { UsageCostReport } from "@/modules/admin";
import { count, money, percent } from "./format";

export default function ByAgency({ agencies }: { agencies: UsageCostReport["byAgency"] }) {
  return (
    <section aria-labelledby="by-agency" className="rounded-md border border-border bg-surface">
      <header className="px-5 pt-5 pb-3">
        <h2 id="by-agency" className="text-[16px] font-semibold">
          By agency
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Margin compares the credits used, at the cheapest credit price, with our real AI cost.</p>
      </header>
      {agencies.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-muted-foreground">No agency used any credits in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-y border-border bg-muted text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium sm:px-5">Agency</th>
                <th className="px-2 py-2 text-right font-medium sm:px-3">Credits used</th>
                <th className="px-2 py-2 text-right font-medium sm:px-3">Real AI cost</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agencies.map((a) => (
                <tr key={a.id ?? "none"} data-agency={a.id ?? ""}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                      {a.name}
                      {a.isTest && <Badge variant="outline">Test</Badge>}
                    </span>
                  </td>
                  <td className="tabular px-2 py-2.5 text-right sm:px-3">{count(a.credits)}</td>
                  <td className="tabular px-2 py-2.5 text-right sm:px-3">{money(a.costUsd)}</td>
                  <td className={cn("tabular px-4 py-2.5 text-right sm:px-5", a.margin !== null && a.margin < 0 && "font-medium text-low-text")}>
                    {percent(a.margin) || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
