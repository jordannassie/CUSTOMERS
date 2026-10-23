import { Suspense } from "react";
import { listBusinesses, pageParam, searchParam } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import AdminPageHeader from "../_components/page-header";
import { ListSkeleton } from "../_components/skeletons";
import BusinessesTable from "./_components/businesses-table";

export const metadata = { title: "Businesses" };

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

// The admin check runs inside Suspense too: awaiting it at the top would block every search.
export default function AdminBusinessesPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
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
  return <BusinessesTable list={await listBusinesses({ search, page: pageParam.parse(params.page) })} search={search} />;
}
