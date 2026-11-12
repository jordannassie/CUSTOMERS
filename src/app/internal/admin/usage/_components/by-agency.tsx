"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UsageCostReport } from "@/modules/admin";
import { TestBadge } from "../../_components/badges";
import { count, money, percent } from "./format";

type Agency = UsageCostReport["byAgency"][number];

// The agencies that cost the most first; the rest one click away, so the page stays short.
const SHOWN = 10;

function Name({ agency }: { agency: Agency }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-medium">
      {agency.id ? (
        <Link href={`/internal/admin/agencies/${agency.id}`} className="min-w-0 break-words text-primary hover:underline">
          {agency.name}
        </Link>
      ) : (
        agency.name
      )}
      {agency.isTest && <TestBadge />}
    </span>
  );
}

/** This agency's part of the period's AI cost, as a short bar and a percent. */
function Share({ share }: { share: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-20 overflow-hidden rounded-xs bg-muted">
        <span className="block h-full rounded-xs bg-primary" style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }} />
      </span>
      <span className="tabular-nums">{share > 0 && share < 0.01 ? "Under 1%" : percent(share)}</span>
    </span>
  );
}

function Margin({ agency }: { agency: Agency }) {
  if (agency.margin === null) return <span className="text-text-hint">No credits used</span>;
  return <span className={cn("tabular-nums", agency.margin < 0 && "font-medium text-mid-text")}>{percent(agency.margin)}</span>;
}

export default function ByAgency({ agencies }: { agencies: UsageCostReport["byAgency"] }) {
  const [all, setAll] = useState(false);
  const sorted = [...agencies].sort((a, b) => b.costUsd - a.costUsd || b.credits - a.credits);
  const totalCost = sorted.reduce((sum, a) => sum + a.costUsd, 0);
  const shareOf = (a: Agency) => (totalCost > 0 ? a.costUsd / totalCost : 0);
  const rows = all ? sorted : sorted.slice(0, SHOWN);

  return (
    <section aria-labelledby="by-agency" className="rounded-md border border-border bg-surface">
      <header className="px-5 pt-5 pb-3">
        <h2 id="by-agency" className="text-[length:calc(16px*var(--px,1))] font-semibold">
          By agency
        </h2>
        <p className="mt-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
          Highest real AI cost first. Margin compares the credits used, at the cheapest credit price, with our real AI cost.
        </p>
      </header>

      {sorted.length === 0 ? (
        <p className="px-5 pb-5 text-[length:calc(13px*var(--px,1))] text-muted-foreground">No agency used any credits in this period.</p>
      ) : (
        <>
          <div className="hidden border-t border-border md:block">
            <Table className="text-[length:calc(13px*var(--px,1))]">
              <TableHeader>
                <TableRow>
                  {["Agency", "Credits used", "Real AI cost", "Share of AI cost", "Margin"].map((h) => (
                    <TableHead key={h} className="px-5 text-[length:calc(12px*var(--px,1))] font-medium text-muted-foreground">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id ?? "none"} data-agency={a.id ?? ""}>
                    <TableCell className="max-w-[calc(320px*var(--px,1))] px-5 whitespace-normal">
                      <Name agency={a} />
                    </TableCell>
                    <TableCell className="px-5 tabular-nums">{count(a.credits)}</TableCell>
                    <TableCell className="px-5 tabular-nums">{money(a.costUsd)}</TableCell>
                    <TableCell className="px-5">
                      <Share share={shareOf(a)} />
                    </TableCell>
                    <TableCell className="px-5">
                      <Margin agency={a} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phones: one card per agency, so nothing scrolls sideways. */}
          <ul className="flex flex-col divide-y divide-border border-t border-border text-[length:calc(13px*var(--px,1))] md:hidden">
            {rows.map((a) => (
              <li key={a.id ?? "none"} className="flex flex-col gap-2 px-4 py-3">
                <Name agency={a} />
                <dl className="grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-text-hint">Credits</dt>
                    <dd className="tabular-nums">{count(a.credits)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-hint">AI cost</dt>
                    <dd className="tabular-nums">{money(a.costUsd)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-hint">Margin</dt>
                    <dd>
                      <Margin agency={a} />
                    </dd>
                  </div>
                </dl>
                <Share share={shareOf(a)} />
              </li>
            ))}
          </ul>

          {sorted.length > SHOWN && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[length:calc(13px*var(--px,1))]">
              <span className="text-muted-foreground">
                Showing {rows.length} of <span className="tabular-nums">{sorted.length}</span> agencies
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => setAll((v) => !v)} aria-expanded={all}>
                {all ? "Show the top 10" : `Show all ${sorted.length}`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
