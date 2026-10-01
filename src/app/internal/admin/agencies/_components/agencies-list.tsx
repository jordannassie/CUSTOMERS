import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminAgencyList, AdminAgencyRow, AgencyFilter } from "@/modules/admin";
import { formatDate } from "../../businesses/_components/scan-parts";
import { STATUS, StatusBadge, TestBadge, credits } from "./agency-parts";

const BASE = "/internal/admin/agencies";
const href = (id: string) => `${BASE}/${id}`;
const FILTERS: { status: AgencyFilter | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "trialing", label: STATUS.trialing.label },
  { status: "active", label: STATUS.active.label },
  { status: "past_due", label: STATUS.past_due.label },
  { status: "canceled", label: STATUS.canceled.label },
  { status: "suspended", label: STATUS.suspended.label },
  { status: "deleted", label: STATUS.deleted.label },
  { status: "test", label: "Test" },
];

export default function AgenciesList({ list, status }: { list: AdminAgencyList; status: AgencyFilter | undefined }) {
  const { rows, counts } = list;
  return (
    <div className="flex flex-col gap-4">
      {/* Wraps on phones instead of scrolling, so no filter is ever hidden off the edge. */}
      <nav aria-label="Filter by status">
        <ul className="flex w-fit max-w-full flex-wrap gap-1 rounded-md border border-border bg-muted p-1">
          {FILTERS.map((f) => {
            const active = f.status === status;
            const count = f.status ? counts[f.status] : counts.all;
            return (
              <li key={f.label}>
                <Link
                  href={f.status ? `${BASE}?status=${f.status}` : BASE}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular-nums text-[12px]",
                      f.status === "past_due" && count > 0 ? "font-semibold text-low-text" : "text-text-hint",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center">
          <Building2 aria-hidden className="size-6 text-text-hint" />
          <p className="text-[15px] font-medium">{status ? "No agencies here" : "No agencies yet"}</p>
          <p className="max-w-sm text-[14px] text-muted-foreground">
            {status ? "Pick another filter to see the rest." : "An agency shows up here as soon as someone signs up."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden rounded-md border border-border bg-surface md:block">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Businesses</TableHead>
                  <TableHead className="text-right">Credits (plan / top-up)</TableHead>
                  <TableHead>Trial ends</TableHead>
                  <TableHead>Signed up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[260px]">
                      <span className="flex items-center gap-2">
                        <Link href={href(r.id)} className="truncate font-medium text-primary hover:underline">
                          {r.name}
                        </Link>
                        {r.isTest && <TestBadge />}
                      </span>
                      <span className="block truncate text-text-hint">{r.ownerEmail ?? "Owner email unknown"}</span>
                    </TableCell>
                    <TableCell>
                      <StatusCell row={r} />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="tabular-nums">{r.businesses}</span>
                      <span className="block truncate text-text-hint">{r.planMix || "No plan yet"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <CreditsCell row={r} />
                    </TableCell>
                    <TableCell>{r.trialEndsAt ? formatDate(r.trialEndsAt) : <span className="text-text-hint">None</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={href(r.id)} className="flex flex-col gap-2 px-4 py-3 text-[13px] hover:bg-muted">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-primary">{r.name}</span>
                        {r.isTest && <TestBadge />}
                      </span>
                      <span className="block truncate text-text-hint">{r.ownerEmail ?? "Owner email unknown"}</span>
                    </span>
                    <StatusBadge status={r.status} />
                  </span>
                  <span className="text-muted-foreground">
                    {r.businesses} {r.businesses === 1 ? "business" : "businesses"}
                    {r.planMix && ` (${r.planMix})`}, {credits(r.credits.plan)} plan and {credits(r.credits.topup)} top-up
                    credits
                    {r.trialEndsAt && r.status === "trialing" && `, trial ends ${formatDate(r.trialEndsAt)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatusCell({ row }: { row: AdminAgencyRow }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <StatusBadge status={row.status} />
      {row.restoreUntil ? (
        <span className="text-text-hint">Restorable until {formatDate(row.restoreUntil)}</span>
      ) : (
        !row.stripeLinked && <span className="text-text-hint">Not linked to Stripe</span>
      )}
    </span>
  );
}

function CreditsCell({ row }: { row: AdminAgencyRow }) {
  return (
    <span className="flex flex-col items-end tabular-nums">
      <span>
        {credits(row.credits.plan)} / {credits(row.credits.topup)}
      </span>
      {row.credits.overdraft > 0 && <span className="text-low-text">{credits(row.credits.overdraft)} overdrawn</span>}
    </span>
  );
}
