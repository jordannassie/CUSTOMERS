import { Skeleton } from "@/components/ui/skeleton";

// Placeholders the size of each streamed Overview block (sections.tsx), in the Check-in shapes, so the thread does not
// jump as the messages arrive. Skeletons sit on white cards in the sunken colour.

function Message({ first = false, children }: { first?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3" aria-hidden="true">
      {first ? <Skeleton className="hidden size-9 shrink-0 rounded-full sm:block" /> : <span className="hidden w-9 shrink-0 sm:block" />}
      <div className={`flex min-w-0 flex-1 flex-col gap-3.5 bg-card px-6 py-[22px] ${first ? "rounded-[6px_20px_20px_20px]" : "rounded-[20px]"}`}>{children}</div>
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading your check-in">
      <Message first>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-w-[240px] flex-1 flex-col gap-3">
            <Skeleton className="h-7 w-full max-w-md" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <Skeleton className="mx-auto size-[200px] rounded-full" />
        </div>
      </Message>
      <Message>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-64 rounded-lg" />
      </Message>
      <Message>
        <Skeleton className="h-6 w-1/2" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </Message>
    </div>
  );
}

export function ActionsSkeleton() {
  return (
    <Message>
      <Skeleton className="h-6 w-1/2" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-lg" />
      ))}
    </Message>
  );
}

export function RailSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden="true">
      <div className="flex flex-col gap-2.5 rounded-xl bg-card p-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl bg-card p-5">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    </div>
  );
}

/** The whole Overview while the page's first reads run: the header, the question bubble, the thread and the rail. */
export function OverviewLoading() {
  return (
    <div className="flex w-full flex-wrap items-start gap-7 px-4 pt-4 pb-12 sm:px-7 sm:pt-6" aria-busy="true">
      <div className="mx-auto flex min-w-0 max-w-[820px] flex-[3_1_560px] flex-col gap-[18px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" aria-hidden="true">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48 bg-surface" />
            <Skeleton className="h-4 w-72 max-w-full bg-surface" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40 rounded-full bg-surface" />
            <Skeleton className="h-9 w-24 rounded-full bg-surface" />
          </div>
        </div>
        <Skeleton className="h-12 w-72 max-w-[80%] self-end rounded-[20px_20px_6px_20px] bg-brand-tint-2" aria-hidden="true" />
        <ThreadSkeleton />
      </div>
      <div className="w-full min-w-0 flex-[1_1_260px] lg:max-w-[340px]">
        <RailSkeleton />
      </div>
    </div>
  );
}
