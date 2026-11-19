import { PageSkeleton, ReportSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton label="Loading usage and cost">
      <ReportSkeleton />
    </PageSkeleton>
  );
}
