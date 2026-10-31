import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import type { Finding, ReadinessCheckResult } from "@/modules/readiness-check";

const LEVEL_STYLE: Record<Finding["level"], string> = {
  "High impact": "bg-low-bg text-low-text",
  "Worth doing": "bg-mid-bg text-mid-text",
  "Keep it up": "bg-good-bg text-good-text",
};

export function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <section aria-labelledby="fix-heading" className="flex flex-col gap-4">
      <h2 id="fix-heading" className="text-xl font-semibold tracking-[-0.02em]">
        What to fix first on your site
      </h2>
      <ol className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {findings.map((f) => (
          <li key={f.title} className="flex flex-col gap-2 p-4 sm:flex-row sm:gap-4 sm:p-5">
            <span className={cn("h-fit w-fit shrink-0 rounded-sm px-2 py-0.5 text-[13px] font-medium sm:w-28 sm:text-center", LEVEL_STYLE[f.level])}>
              {f.level}
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold">{f.title}</p>
              <p className="max-w-[70ch] text-[14px] text-muted-foreground">{f.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Mark({ on, site }: { on: boolean; site: string }) {
  return on ? (
    <Check className="mx-auto size-4 text-primary" aria-label={`${site}: found`} />
  ) : (
    <Minus className="mx-auto size-4 text-text-hint" aria-label={`${site}: not found`} />
  );
}

export function ChecksTable({ result }: { result: ReadinessCheckResult }) {
  const { mine, them } = result;
  return (
    <section aria-labelledby="checks-heading" className="flex flex-col gap-4">
      <h2 id="checks-heading" className="text-xl font-semibold tracking-[-0.02em]">
        What we checked
      </h2>
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full table-fixed text-left">
          <thead className="bg-muted text-[13px] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Check</th>
              <th scope="col" className="w-20 truncate px-2 py-3 text-center font-medium sm:w-40" title={mine.domain}>
                <span className="sm:hidden">You</span>
                <span className="hidden sm:inline">{mine.domain}</span>
              </th>
              <th scope="col" className="w-20 truncate px-2 py-3 text-center font-medium sm:w-40" title={them.domain}>
                <span className="sm:hidden">Them</span>
                <span className="hidden sm:inline">{them.domain}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.checks.map((c) => (
              <tr key={c.label}>
                <th scope="row" className="px-4 py-3 font-normal">
                  <p className="text-[14px] font-medium">{c.label}</p>
                  <p className="text-[13px] text-muted-foreground">{c.detail}</p>
                </th>
                <td className="px-2 py-3">{mine.reached ? <Mark on={c.mine} site={mine.domain} /> : null}</td>
                <td className="px-2 py-3">{them.reached ? <Mark on={c.them} site={them.domain} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-text-hint">
        We read each home page once. Pages that load their content with scripts may show fewer items than a visitor sees.
      </p>
    </section>
  );
}
