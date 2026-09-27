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
          <table className="w-full min-w-[480px] text-[13px]">
            <thead className="border-y border-border bg-muted text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Agency</th>
                <th className="px-3 py-2 text-right font-medium">Credits used</th>
                <th className="px-3 py-2 text-right font-medium">Real AI cost</th>
                <th className="px-5 py-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agencies.map((a) => (
                <tr key={a.id ?? "none"} data-agency={a.id ?? ""}>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      {a.name}
                      {a.isTest && <Badge variant="outline">Test</Badge>}
                    </span>
                  </td>
                  <td className="tabular px-3 py-2.5 text-right">{count(a.credits)}</td>
                  <td className="tabular px-3 py-2.5 text-right">{money(a.costUsd)}</td>
                  <td className={cn("tabular px-5 py-2.5 text-right", a.margin !== null && a.margin < 0 && "font-medium text-low-text")}>
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
