import { ListSkeleton, PageSkeleton } from "../_components/skeletons";

export default function AppsLoading() {
  return (
    <PageSkeleton label="Loading AI apps">
      <ListSkeleton />
    </PageSkeleton>
  );
}
