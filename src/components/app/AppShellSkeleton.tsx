import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8">
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
    <div className="app-v2 flex min-h-dvh bg-muted">
      <aside className="hidden h-dvh w-[256px] shrink-0 flex-col gap-3 p-3 lg:flex">
        <Skeleton className="mx-2 mt-2 h-7 w-36 bg-border" />
        <Skeleton className="h-12 bg-border/70" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-8 bg-border/60" />
          ))}
        </div>
        <Skeleton className="mt-auto h-20 bg-border/70" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="flex flex-1 flex-col bg-background lg:rounded-xl lg:border lg:border-border">
          <div className="hidden h-[52px] border-b border-border lg:block" />
          <div className="h-14 border-b border-border bg-surface lg:hidden" />
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
