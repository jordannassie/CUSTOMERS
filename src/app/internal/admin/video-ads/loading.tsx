import { ListSkeleton, PageSkeleton } from "../_components/skeletons";

export default function VideoAdsLoading() {
  return (
    <PageSkeleton label="Loading video ad orders">
      <ListSkeleton />
    </PageSkeleton>
  );
}
