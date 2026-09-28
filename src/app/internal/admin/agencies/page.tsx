import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { agencyFilter, listAgencies } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import AgenciesList from "./_components/agencies-list";

export const metadata = { title: "Agencies" };

type Props = { searchParams: Promise<{ status?: string | string[] }> };

// The admin check runs inside Suspense too: awaiting it at the top would block every filter change.
export default function AdminAgenciesPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Agencies</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Every customer account. Open one to change credits, extend a trial, suspend or restore it.
        </p>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <LiveAgencies searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LiveAgencies({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/agencies" });
  const status = agencyFilter.parse((await searchParams).status);
  return <AgenciesList list={await listAgencies(status)} status={status} />;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading agencies">
      <Skeleton className="h-10 w-full max-w-xl rounded-md" />
      <Skeleton className="h-[480px] rounded-md" />
    </div>
  );
}
