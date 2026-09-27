import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinesses } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import BusinessesTable from "./_components/businesses-table";

export const metadata = { title: "Businesses" };

export default async function AdminBusinessesPage() {
  await requireAdmin({ next: "/internal/admin/businesses" });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Businesses</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Every business across all agencies. Open one to see its setup, answers and scans, or to rescan it.
        </p>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <BusinessList />
      </Suspense>
    </div>
  );
}

async function BusinessList() {
  return <BusinessesTable rows={await listBusinesses()} />;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy aria-label="Loading businesses">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-[420px] rounded-md" />
    </div>
  );
}
