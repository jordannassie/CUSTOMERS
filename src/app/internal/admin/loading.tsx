import { PageSkeleton, ReportSkeleton } from "./_components/skeletons";

export default function AdminLoading() {
  return (
    <PageSkeleton label="Loading overview">
      <ReportSkeleton />
    </PageSkeleton>
  );
}
