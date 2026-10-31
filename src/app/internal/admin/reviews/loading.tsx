import { ListSkeleton, PageSkeleton } from "../_components/skeletons";

export default function ReviewsLoading() {
  return (
    <PageSkeleton label="Loading app reviews">
      <ListSkeleton />
    </PageSkeleton>
  );
}
