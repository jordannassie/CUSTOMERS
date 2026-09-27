import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-5 sm:p-8">
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

// Same frame as AppShell, so the page does not jump when the sidebar data arrives.
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r border-border bg-muted p-3 lg:flex">
        <Skeleton className="mx-1.5 mt-2 h-8 w-32 bg-border" />
        <Skeleton className="h-12 bg-border" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 bg-border" />
          ))}
        </div>
        <Skeleton className="mt-auto h-24 bg-border" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b border-border bg-surface lg:hidden" />
        <PageSkeleton />
      </div>
    </div>
  );
}
