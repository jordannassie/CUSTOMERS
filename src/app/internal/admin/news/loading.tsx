import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton label="Loading LinkedIn studio">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-lg rounded-md" />
      <Skeleton className="h-[240px] rounded-md" />
    </PageSkeleton>
  );
}
