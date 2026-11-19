import { DetailSkeleton, PageSkeleton } from "../../_components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton label="Loading agency">
      <DetailSkeleton />
    </PageSkeleton>
  );
}
