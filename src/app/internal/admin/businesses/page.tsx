import { Suspense } from "react";
import { businessFilter, listBusinesses, pageParam, searchParam } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import AdminPageHeader from "../_components/page-header";
import { ListSkeleton } from "../_components/skeletons";
import BusinessesTable from "./_components/businesses-table";

export const metadata = { title: "Businesses" };

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string | string[]; filter?: string | string[] }> };

// The admin check runs inside Suspense too: awaiting it at the top would block every search.
export default function AdminBusinessesPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title="Businesses"
        subtitle="Every business across all agencies. Open one to see its setup, answers and scans, or to rescan it."
      />
      <Suspense fallback={<ListSkeleton label="Loading businesses" />}>
        <BusinessList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BusinessList({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/businesses" });
  const params = await searchParams;
  const search = searchParam.parse(params.q);
  const filter = businessFilter.parse(Array.isArray(params.filter) ? params.filter[0] : params.filter);
  return <BusinessesTable list={await listBusinesses({ search, page: pageParam.parse(params.page), filter })} search={search} filter={filter} />;
}
