import { PageContainer } from "@/components/app/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

// The Questions page while it loads: the header, the four numbers, the add form and the list rows.
export default function QuestionsLoading() {
  return (
    <PageContainer>
      <div role="status" aria-busy className="flex flex-col gap-6">
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface">
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-96 max-w-full" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid gap-3 border-t border-border px-5 py-4 lg:grid-cols-[minmax(0,1fr)_repeat(3,112px)_64px_72px]">
              <Skeleton className="h-5 max-w-md" />
              {[0, 1, 2].map((m) => (
                <Skeleton key={m} className="hidden h-5 lg:block" />
              ))}
              <Skeleton className="hidden h-5 lg:block" />
              <Skeleton className="hidden h-5 lg:block" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
