import { Suspense } from "react";
import { agencyFilter, listAgencies, pageParam, searchParam } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import AdminPageHeader from "../_components/page-header";
import { ListSkeleton } from "../_components/skeletons";
import AgenciesList from "./_components/agencies-list";

export const metadata = { title: "Agencies" };

type Props = { searchParams: Promise<{ status?: string | string[]; q?: string | string[]; page?: string | string[] }> };

// The admin check runs inside Suspense too: awaiting it at the top would block every filter change.
export default function AdminAgenciesPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Agencies"
        subtitle="Every customer account. Open one to change credits, extend a trial, suspend or restore it."
      />
      <Suspense fallback={<ListSkeleton label="Loading agencies" />}>
        <LiveAgencies searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LiveAgencies({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/agencies" });
  const params = await searchParams;
  const status = agencyFilter.parse(params.status);
  const search = searchParam.parse(params.q);
  const list = await listAgencies({ filter: status, search, page: pageParam.parse(params.page) });
  return <AgenciesList list={list} status={status} search={search} />;
}
