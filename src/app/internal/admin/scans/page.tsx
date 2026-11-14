import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth";
import { listScanFilterOptions, listScanJobs, scanListQuery } from "@/modules/admin";
import AdminPageHeader from "../_components/page-header";
import { ListSkeleton } from "../_components/skeletons";
import ScansList from "./_components/scans-list";

export const metadata = { title: "Scans" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// The admin check runs inside Suspense too: awaiting it at the top would block every filter change.
export default function AdminScansPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title="Scans"
        subtitle="Every scan job, newest first. Real cost is what the AI tools billed us for each scan, taken from the same log as Usage and cost."
      />
      <Suspense fallback={<ListSkeleton label="Loading scans" />}>
        <LiveScans searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LiveScans({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/scans" });
  const raw = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const query = scanListQuery.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, one(v)])));
  const [list, options] = await Promise.all([listScanJobs(query), listScanFilterOptions()]);
  return <ScansList list={list} query={query} options={options} />;
}
