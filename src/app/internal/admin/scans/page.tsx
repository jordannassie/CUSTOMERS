import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/modules/auth";
import { listScanJobs, scanFilter } from "@/modules/admin";
import ScansList from "./_components/scans-list";

export const metadata = { title: "Scans" };

type Props = { searchParams: Promise<{ status?: string | string[] }> };

// The admin check runs inside Suspense too: awaiting it at the top would block every filter change.
export default function AdminScansPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Scans</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Every scan job, newest first. Real cost is what the AI providers charged us; cached answers cost nothing.
        </p>
      </header>
      <Suspense fallback={<ScansSkeleton />}>
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

function ScansSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading scans">
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <Skeleton className="h-[480px] rounded-md" />
    </div>
  );
}
