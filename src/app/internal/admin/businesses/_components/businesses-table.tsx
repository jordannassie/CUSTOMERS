import Link from "next/link";
import { Store } from "lucide-react";
import AdminEmpty from "../../_components/admin-empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_PAGE_SIZE, BUSINESS_FILTERS, type AdminBusinessList, type AdminBusinessRow, type BusinessFilter } from "@/modules/admin";
import FilterTabs from "../../_components/filter-tabs";
import Pagination from "../../_components/pagination";
import SearchBox from "../../_components/search-box";
import BusinessCards from "./business-cards";
import { AgencyLink, LastScan, StateBadge, businessHref, frequencyText, placeNote, planText } from "./row-parts";
import { ModelList } from "./scan-parts";

const BASE = "/internal/admin/businesses";
// The first column stays put while the rest of the table scrolls sideways.
const STICKY = "sticky left-0 z-10 bg-surface";

// Live is scanning on its schedule; paused businesses have their own tab, so Live never hides one that is not.
const TAB_LABELS: Record<BusinessFilter, string> = {
  all: "All",
  live: "Live",
  paused: "Paused",
  setup: "Being set up",
  deleted: "Deleted",
  test: "Test agencies",
};

function tabHref(filter: BusinessFilter, search: string): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (filter !== "all") params.set("filter", filter);
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

export default function BusinessesTable({ list, search, filter = "all" }: { list: AdminBusinessList; search: string; filter?: BusinessFilter }) {
  const { rows, total, counts } = list;
  return (
    <div className="flex flex-col gap-4">
      <SearchBox id="businesses-search" label="Search" placeholder="Business, agency or owner email" />
      {/* Each tab counts what it holds for this search, so no number on the page is for another tab. */}
      <FilterTabs
        label="Filter businesses"
        active={filter}
        tabs={BUSINESS_FILTERS.map((f) => ({ key: f, label: TAB_LABELS[f], href: tabHref(f, search), count: counts[f] }))}
      />
      {rows.length === 0 ? (
        search || filter !== "all" ? (
          <AdminEmpty icon={Store} title="No businesses match">
            Check the spelling, search part of the business name, agency name or owner email, or pick All.
          </AdminEmpty>
        ) : (
          <AdminEmpty icon={Store} title="No businesses yet">
            A business shows up here as soon as an agency adds one during setup.
          </AdminEmpty>
        )
      ) : (
        <section aria-label="Businesses" className="flex flex-col gap-2">
          <Rows rows={rows} />
          <BusinessCards rows={rows} />
        </section>
      )}
      <Pagination base={BASE} params={{ q: search || undefined, filter: filter === "all" ? undefined : filter }} page={list.page} pages={list.pages} total={total} pageSize={ADMIN_PAGE_SIZE} noun="businesses" />
    </div>
  );
}

const hint = (text: string) => <span className="text-text-hint">{text}</span>;

function Rows({ rows }: { rows: AdminBusinessRow[] }) {
  return (
    <div className="hidden rounded-md border border-border bg-surface md:block">
      <Table className="text-[length:calc(13px*var(--px,1))]">
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
              <TableCell className={`${STICKY} max-w-[calc(260px*var(--px,1))] min-w-44 whitespace-normal`}>
                <span className="flex items-start gap-2">
                  <Link href={businessHref(r.id)} className="line-clamp-2 min-w-0 break-words font-medium text-primary hover:underline" title={r.name}>
                    {r.name}
                  </Link>
                  <StateBadge row={r} />
                </span>
                <span className="block text-text-hint">{placeNote(r)}</span>
              </TableCell>
              <TableCell className="max-w-[calc(260px*var(--px,1))] min-w-44 whitespace-normal">
                <AgencyLink agency={r.agency} />
                {r.agency && (
                  <span className="block truncate text-text-hint" title={r.agency.ownerEmail ?? "Owner email unknown"}>
                    {r.agency.ownerEmail ?? "Owner email unknown"}
                  </span>
                )}
              </TableCell>
              <TableCell>{planText(r) ?? hint("No plan")}</TableCell>
              <TableCell>{frequencyText(r) ?? hint("None")}</TableCell>
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
  );
}
