import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton label="Checking services">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[calc(116px*var(--px,1))] rounded-md" />
        <Skeleton className="h-[calc(200px*var(--px,1))] rounded-md" />
        <Skeleton className="h-[calc(260px*var(--px,1))] rounded-md" />
      </div>
    </PageSkeleton>
  );
}
