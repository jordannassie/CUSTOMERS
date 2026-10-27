import { Skeleton } from "@/components/ui/skeleton";

// The Sources page while it loads, shaped like the loaded page (DESIGN.md) so nothing jumps.
export function SourcesSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-[520px] max-w-full" />
        </div>
        <Skeleton className="h-10 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Box key={i}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </Box>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Box>
          <Skeleton className="h-5 w-44" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </Box>
        <Box>
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-1.5 rounded-xs" />
            </div>
          ))}
        </Box>
      </div>
      <Box>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-96 max-w-full" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </Box>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">{children}</div>;
}
