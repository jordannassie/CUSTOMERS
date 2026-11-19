import { ListSkeleton, PageSkeleton } from "../_components/skeletons";

export default function LeadsLoading() {
  return (
    <PageSkeleton label="Loading leads">
      <ListSkeleton />
    </PageSkeleton>
  );
}
