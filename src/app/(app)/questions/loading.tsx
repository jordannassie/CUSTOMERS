import { PageContainer } from "@/components/app/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

// The Questions page while it loads: the header, the strip of four numbers, the two summary bars and the list rows.
export default function QuestionsLoading() {
  return (
    <PageContainer>
      <div role="status" aria-busy className="flex flex-col gap-5">
        <span className="sr-only">Loading your questions…</span>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2 bg-surface px-[18px] pt-4 pb-3.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 pt-3.5 pb-4">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex gap-2 border-b border-border px-4 py-2.5">
            <Skeleton className="h-8 w-96 max-w-full" />
            <Skeleton className="hidden h-8 w-60 md:block" />
          </div>
          <div className="hidden h-9 border-b border-border bg-muted lg:block" />
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 lg:grid-cols-[84px_minmax(0,1fr)_96px_80px_112px_36px] lg:gap-x-4"
            >
              <Skeleton className="size-[34px] rounded-full" />
              <Skeleton className="h-5 max-w-md" />
              <Skeleton className="hidden h-5 lg:block" />
              <Skeleton className="hidden h-5 lg:block" />
              <Skeleton className="hidden h-5 lg:block" />
              <span className="hidden lg:block" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
