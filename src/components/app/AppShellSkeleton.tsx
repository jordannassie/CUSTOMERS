import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8">
      <Skeleton className="h-8 w-56 bg-surface" />
      <Skeleton className="h-4 w-72 max-w-full bg-surface" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl bg-surface" />
        <Skeleton className="h-28 rounded-xl bg-surface" />
        <Skeleton className="h-28 rounded-xl bg-surface" />
      </div>
      <Skeleton className="h-64 rounded-xl bg-surface" />
    </div>
  );
}

// Same frame as AppShell (mockup-ui), so the page does not jump when the sidebar data arrives.
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden h-dvh w-[220px] shrink-0 flex-col gap-[22px] px-4 py-6 lg:flex">
        <Skeleton className="mx-2.5 h-7 w-40 bg-surface" />
        <Skeleton className="h-[52px] rounded-[14px] bg-surface" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-[10px] bg-surface/70" />
          ))}
        </div>
        <Skeleton className="mt-auto h-20 rounded-[14px] bg-surface/70" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col">
          <div className="hidden h-14 lg:block" />
          <div className="h-14 border-b border-border lg:hidden" />
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
