import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth";
import { listScanJobs, scanFilter } from "@/modules/admin";
import AdminPageHeader from "../_components/page-header";
import { ListSkeleton } from "../_components/skeletons";
import ScansList from "./_components/scans-list";

export const metadata = { title: "Scans" };

type Props = { searchParams: Promise<{ status?: string | string[] }> };

// The admin check runs inside Suspense too: awaiting it at the top would block every filter change.
export default function AdminScansPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Scans"
        subtitle="Every scan job, newest first. Real cost is what the AI providers charged us; cached answers cost nothing."
      />
      <Suspense fallback={<ListSkeleton label="Loading scans" />}>
        <LiveScans searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LiveScans({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/scans" });
  const status = scanFilter.parse((await searchParams).status);
  return <ScansList list={await listScanJobs(status)} status={status} />;
}
