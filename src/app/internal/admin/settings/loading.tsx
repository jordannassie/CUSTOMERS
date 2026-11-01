import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton label="Checking services">
      <div className="flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-[116px] rounded-md" />
        <Skeleton className="h-[200px] rounded-md" />
        <Skeleton className="h-[260px] rounded-md" />
      </div>
    </PageSkeleton>
  );
}
