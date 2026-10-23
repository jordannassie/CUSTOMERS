import Link from "next/link";
import { Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_PAGE_SIZE, type AdminAgencyList, type AdminAgencyRow, type AgencyFilter } from "@/modules/admin";
import { formatDate } from "../../_components/format";
import AdminEmpty from "../../_components/admin-empty";
import FilterTabs from "../../_components/filter-tabs";
import Pagination, { pageHref } from "../../_components/pagination";
import SearchBox from "../../_components/search-box";
import { TestBadge } from "../../_components/badges";
import { STATUS, StatusBadge, credits } from "./agency-parts";

const BASE = "/internal/admin/agencies";
const href = (id: string) => `${BASE}/${id}`;
const FILTERS: { status: AgencyFilter | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "trialing", label: STATUS.trialing.label },
  { status: "trial_ended", label: STATUS.trial_ended.label },
  { status: "signup_unfinished", label: STATUS.signup_unfinished.label },
  { status: "active", label: STATUS.active.label },
  { status: "past_due", label: STATUS.past_due.label },
  { status: "canceled", label: STATUS.canceled.label },
  { status: "suspended", label: STATUS.suspended.label },
  { status: "deleted", label: STATUS.deleted.label },
  { status: "test", label: "Test" },
];

// The first column stays put while the rest of the table scrolls sideways.
const STICKY = "sticky left-0 z-10 bg-surface";

export default function AgenciesList({ list, status, search }: { list: AdminAgencyList; status: AgencyFilter | undefined; search: string }) {
  const { rows, counts } = list;
  const params = { status, q: search || undefined };
  return (
    <div className="flex flex-col gap-4">
      <SearchBox id="agencies-search" label="Search" placeholder="Agency name or owner email" />
      <FilterTabs
        label="Filter by status"
        active={status ?? "all"}
        tabs={FILTERS.map((f) => ({
          key: f.status ?? "all",
          label: f.label,
          href: pageHref(BASE, { status: f.status, q: search || undefined }, 1),
          count: f.status ? counts[f.status] : counts.all,
          alert: f.status === "past_due",
        }))}
      />

      {rows.length === 0 ? (
        search || status ? (
          <AdminEmpty icon={Building2} title={search ? "No agencies match this search" : "No agencies match this filter"}>
            {search ? "Check the spelling, or search part of the name or email." : "Pick another filter to see the rest."}
          </AdminEmpty>
        ) : (
          <AdminEmpty icon={Building2} title="No agencies yet">
            An agency shows up here as soon as someone signs up.
          </AdminEmpty>
        )
      ) : (
        <>
          <div className="hidden rounded-md border border-border bg-surface md:block">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={`${STICKY} bg-muted`}>Agency</TableHead>
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
                    <TableCell className={`${STICKY} max-w-[260px] min-w-44 whitespace-normal`}>
                      <span className="flex items-start gap-2">
                        <Link href={href(r.id)} className="line-clamp-2 min-w-0 break-words font-medium text-primary hover:underline" title={r.name}>
                          {r.name}
                        </Link>
                        {r.isTest && <TestBadge />}
                      </span>
                      <span className="block truncate text-text-hint" title={r.ownerEmail ?? "Owner email unknown"}>{r.ownerEmail ?? "Owner email unknown"}</span>
                    </TableCell>
                    <TableCell>
                      <StatusCell row={r} />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="tabular-nums">{r.businesses}</span>
                      <span className="block truncate text-text-hint" title={r.planMix || "No plan yet"}>{r.planMix || "No plan yet"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <CreditsCell row={r} />
                    </TableCell>
                    <TableCell>{trialEnd(r) ?? <span className="text-text-hint">None</span>}</TableCell>
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
                      <span className="flex items-start gap-2">
                        <span className="line-clamp-2 min-w-0 break-words text-[14px] font-medium text-primary" title={r.name}>{r.name}</span>
                        {r.isTest && <TestBadge />}
                      </span>
                      <span className="block truncate text-text-hint" title={r.ownerEmail ?? "Owner email unknown"}>{r.ownerEmail ?? "Owner email unknown"}</span>
                    </span>
                    <StatusBadge status={r.displayStatus} />
                  </span>
                  <span className="text-muted-foreground">
                    {r.businesses} {r.businesses === 1 ? "business" : "businesses"}
                    {r.planMix && ` (${r.planMix})`}, {credits(r.credits.plan)} plan and {credits(r.credits.topup)} top-up
                    credits
                    {trialEnd(r) && `, trial ${r.displayStatus === "trial_ended" ? "ended" : "ends"} ${formatDate(r.trialEndsAt!)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination base={BASE} params={params} page={list.page} pages={list.pages} total={list.total} pageSize={ADMIN_PAGE_SIZE} noun="agencies" />
        </>
      )}
    </div>
  );
}

/** The trial end, for an agency still on a trial (the same rule on phones and desktop). */
function trialEnd(row: AdminAgencyRow): string | null {
  return row.status === "trialing" && row.trialEndsAt ? formatDate(row.trialEndsAt) : null;
}

function StatusCell({ row }: { row: AdminAgencyRow }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <StatusBadge status={row.displayStatus} />
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
