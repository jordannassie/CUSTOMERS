import Link from "next/link";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminEmpty from "../../_components/admin-empty";
import { ScanStatusBadge, TestBadge } from "../../_components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_PAGE_SIZE, type AdminBusinessList, type AdminBusinessRow } from "@/modules/admin";
import Pagination from "../../_components/pagination";
import SearchBox from "../../_components/search-box";
import { DeletedBadge, ModelList, deletedNote, frequencyLabel } from "./scan-parts";
import { formatDate } from "../../_components/format";

const BASE = "/internal/admin/businesses";
const href = (id: string) => `${BASE}/${id}`;
// The first column stays put while the rest of the table scrolls sideways.
const STICKY = "sticky left-0 z-10 bg-surface";

export default function BusinessesTable({ list, search }: { list: AdminBusinessList; search: string }) {
  const { rows, total, deleted, scanning } = list;
  return (
    <div className="flex flex-col gap-4">
      <SearchBox id="businesses-search" label="Search" placeholder="Business, agency or owner email" />
      {rows.length === 0 ? (
        search ? (
          <AdminEmpty icon={Store} title="No businesses match this search">
            Check the spelling, or search part of the business name, agency name or owner email.
          </AdminEmpty>
        ) : (
          <AdminEmpty icon={Store} title="No businesses yet">
            A business shows up here as soon as an agency adds one during setup.
          </AdminEmpty>
        )
      ) : (
        <Rows rows={rows} summary={summary(total, deleted, scanning, search)} />
      )}
      <Pagination base={BASE} params={{ q: search || undefined }} page={list.page} pages={list.pages} total={total} pageSize={ADMIN_PAGE_SIZE} noun="businesses" />
    </div>
  );
}

function summary(total: number, deleted: number, scanning: number | null, search: string): string {
  const parts = [`${total.toLocaleString("en-US")} ${total === 1 ? "business" : "businesses"}${search ? " match" : ""}`];
  if (scanning !== null) parts.push(`${scanning} scanning now`);
  if (deleted > 0) parts.push(`${deleted} deleted`);
  return parts.join(", ");
}

function Rows({ rows, summary }: { rows: AdminBusinessRow[]; summary: string }) {
  return (
    <section aria-label="Businesses" className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">{summary}</p>

      <div className="hidden rounded-md border border-border bg-surface md:block">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead className={`${STICKY} bg-muted`}>Business</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Models</TableHead>
              <TableHead>Last scan</TableHead>
              <TableHead className="text-right">Credits this month</TableHead>
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
                    {r.deleted ? <DeletedBadge /> : r.draft && <DraftBadge />}
                  </span>
                  <span className="block truncate text-text-hint">
                    {r.deleted ? deletedNote(r.deleted.at, r.deleted.purgeAfter, true) : r.location || "No location"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[260px] min-w-44 whitespace-normal">
                  <AgencyCell agency={r.agency} />
                </TableCell>
                <TableCell>{planText(r) ?? <span className="text-text-hint">No plan</span>}</TableCell>
                <TableCell>{r.deleted || r.draft ? <span className="text-text-hint">None</span> : frequencyLabel(r.frequency)}</TableCell>
                <TableCell>
                  <ModelList models={r.models} />
                </TableCell>
                <TableCell>
                  <LastScan scan={r.lastScan} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.creditsThisMonth.toLocaleString("en-US")}</TableCell>
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
                    {r.deleted ? <DeletedBadge /> : r.draft && <DraftBadge />}
                  </span>
                  <span className="block truncate text-text-hint" title={r.agency?.name ?? "No agency"}>{r.agency?.name ?? "No agency"}</span>
                  {r.deleted && (
                    <span className="block text-text-hint">{deletedNote(r.deleted.at, r.deleted.purgeAfter, true)}</span>
                  )}
                </span>
                <LastScan scan={r.lastScan} />
              </span>
              <ModelList models={r.models} className="text-muted-foreground" />
              <span className="text-muted-foreground">
                {[planText(r) ?? "No plan", !r.deleted && !r.draft && frequencyLabel(r.frequency).toLowerCase()].filter(Boolean).join(", ")},{" "}
                {r.creditsThisMonth.toLocaleString("en-US")} credits this month
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// A deleted business has no plan any more; a draft has none yet and no schedule, so neither shows one.
function planText(r: AdminBusinessRow): string | null {
  if (r.deleted) return "Deleted";
  return r.plan;
}

function DraftBadge() {
  return <Badge variant="outline">Draft</Badge>;
}

function AgencyCell({ agency }: { agency: AdminBusinessRow["agency"] }) {
  if (!agency) return <span className="text-text-hint">No agency</span>;
  return (
    <>
      <span className="flex items-center gap-2">
        <Link href={`/internal/admin/agencies/${agency.id}`} className="truncate text-primary hover:underline" title={agency.name}>
          {agency.name}
        </Link>
        {agency.isTest && <TestBadge />}
      </span>
      <span className="block truncate text-text-hint" title={agency.ownerEmail ?? "Owner email unknown"}>{agency.ownerEmail ?? "Owner email unknown"}</span>
    </>
  );
}

function LastScan({ scan }: { scan: AdminBusinessRow["lastScan"] }) {
  if (!scan) return <span className="shrink-0 text-text-hint">Never scanned</span>;
  return (
    <span className="flex shrink-0 flex-col items-start gap-0.5">
      <ScanStatusBadge status={scan.state} />
      <span className="text-text-hint">{formatDate(scan.at)}</span>
    </span>
  );
}
