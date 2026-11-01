"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ShownFix } from "@/modules/reports";

const PRIORITY = {
  critical: { text: "Critical", variant: "low" },
  high: { text: "High priority", variant: "low" },
  medium: { text: "Medium priority", variant: "mid" },
  low: { text: "Low priority", variant: "secondary" },
} as const;
const LEVEL = { high: "High", medium: "Medium", low: "Low" } as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-xs font-semibold">{title}</h4>
      {children}
    </div>
  );
}

function FixDetails({ fix, id }: { fix: ShownFix; id: string }) {
  return (
    <div id={id} className="flex flex-col gap-4 pt-1 pb-5 pl-9 sm:pr-4" data-testid="report-fix-details">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        {[
          ["Impact", LEVEL[fix.impact]],
          ["Effort", LEVEL[fix.effort]],
          ["Who does it", fix.owner],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <Block title="What AI showed us">
        <p className="text-sm break-words">{fix.evidence}</p>
      </Block>
      <Block title="Why it matters">
        <p className="text-sm text-muted-foreground break-words">{fix.why}</p>
      </Block>
      <Block title="Steps">
        <ol className="flex flex-col gap-1.5">
          {fix.steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="min-w-0 break-words">{step}</span>
            </li>
          ))}
        </ol>
      </Block>
      <p className="border-l-2 border-primary pl-3 text-sm break-words">
        <span className="font-semibold">{fix.goal.label}:</span> {fix.goal.text}
      </p>
    </div>
  );
}

/**
 * Every fix in the shown report, in priority order (D-92). A row opens in place to show the evidence, why it matters,
 * the steps and when it is done, as the PDF's fix card has them.
 */
export function ReportFixes({ fixes, none }: { fixes: ShownFix[]; none: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-labelledby="report-fixes" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 sm:p-6" data-testid="report-fixes">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="report-fixes" className="text-base font-semibold tracking-[-0.02em]">
            Fixes
          </h2>
          <p className="text-sm text-muted-foreground">
            {fixes.length === 0 ? none : "Most important first. Open a fix to see what to do. Each one is also in Actions."}
          </p>
        </div>
        {fixes.length > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href="/actions">Open Actions</Link>
          </Button>
        )}
      </div>
      {fixes.length > 0 && (
        <ol className="flex flex-col divide-y divide-border border-t border-border" data-testid="report-top-fixes">
          {fixes.map((fix) => {
            const expanded = open === fix.n;
            const detailsId = `report-fix-${fix.n}`;
            const priority = PRIORITY[fix.priority];
            return (
              <li key={fix.n} data-testid="report-fix">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                  onClick={() => setOpen(expanded ? null : fix.n)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 py-3.5 text-left hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary-hover tabular-nums">
                    {fix.n}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-medium break-words">{fix.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant={priority.variant}>{priority.text}</Badge>
                      <span className="break-words">Where: {fix.where}</span>
                    </span>
                  </span>
                  <ChevronDown aria-hidden className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </button>
                {expanded && <FixDetails fix={fix} id={detailsId} />}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
