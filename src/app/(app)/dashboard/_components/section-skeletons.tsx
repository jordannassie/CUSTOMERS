import { Skeleton } from "@/components/ui/skeleton";

// Placeholders the size of each streamed Overview block (sections.tsx), so the page does not jump as they arrive.

function Head() {
  return (
    <div className="flex h-[52px] items-center border-b border-border px-[18px]">
      <Skeleton className="h-4 w-36" />
    </div>
  );
}

function Rows({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/60 px-[18px] py-3 last:border-b-0">
          <Skeleton className="size-6 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

const CARD = "overflow-hidden rounded-lg border border-border bg-surface";

export function SummarySkeleton() {
  return (
    <div className={CARD} aria-hidden="true">
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-surface px-[18px] pt-4 pb-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-b border-border px-[18px] py-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 p-[18px]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64" />
        </div>
        <div className="border-t border-border lg:border-t-0 lg:border-l">
          <Head />
          <Rows rows={4} />
        </div>
      </div>
    </div>
  );
}

export function ToolsSkeleton() {
  return (
    <div className={CARD} aria-hidden="true">
      <Head />
      <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 px-[18px] py-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PairSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2" aria-hidden="true">
      {[5, 3].map((rows, i) => (
        <div key={i} className={CARD}>
          <Head />
          <Rows rows={rows} />
        </div>
      ))}
    </div>
  );
}

/** The whole page while it loads (loading.tsx): the header, then each block's placeholder. */
export function OverviewLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-5 sm:p-8" aria-busy="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" aria-hidden="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <SummarySkeleton />
      <ToolsSkeleton />
      <PairSkeleton />
    </div>
  );
}
