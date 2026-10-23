import { ListSkeleton, PageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton label="Loading agencies">
      <ListSkeleton />
    </PageSkeleton>
  );
}
