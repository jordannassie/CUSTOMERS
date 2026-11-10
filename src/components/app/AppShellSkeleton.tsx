import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// Same frame as AppShell (mockup-ui), so the page does not jump when the sidebar data arrives.
export function AppShellSkeleton() {
  return (
    <div className="app-v2 app-compact flex min-h-dvh bg-muted">
      <aside className="hidden h-dvh w-[212px] shrink-0 flex-col gap-3 px-3 pb-3 lg:flex">
        <div className="mt-2 flex h-12 items-center">
          <Skeleton className="mx-auto h-[22px] w-40 bg-border" />
        </div>
        <Skeleton className="h-11 bg-border/70" />
        <div className="mt-2 flex flex-col gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-8 bg-border/60" />
          ))}
        </div>
        <Skeleton className="mt-auto h-20 bg-border/70" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="flex flex-1 flex-col bg-background lg:rounded-xl lg:border lg:border-border">
          <div className="hidden h-12 border-b border-border lg:block" />
          <div className="h-14 border-b border-border bg-surface lg:hidden" />
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
