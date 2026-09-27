import { PageContainer } from "@/components/app/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

// Suggestions come from Google while this shows.
export default function Loading() {
  return (
    <PageContainer>
      <div className="mb-8 max-w-2xl">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-md border border-border bg-surface" aria-busy aria-label="Finding businesses near you">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <Skeleton className="size-4" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1.5 h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </PageContainer>
  );
}
