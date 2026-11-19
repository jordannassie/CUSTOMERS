import { Skeleton } from "@/components/ui/skeleton";

// The Sources page while it loads, shaped like the loaded page (DESIGN.md) so nothing jumps.
export function SourcesSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-[calc(520px*var(--px,1))] max-w-full" />
        </div>
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-surface px-4 pt-4 pb-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      {/* "Websites AI used most": one full-width list, as loaded (BUG-314: this was two columns). */}
      <Box>
        <Rows count={6} bar />
      </Box>
      <div className="grid gap-4 xl:grid-cols-2">
        {/* "Kinds of websites": a bar per kind (no donut since BUG-313). */}
        <Box>
          <div className="flex flex-col gap-4 px-4 py-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-1.5 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        </Box>
        <Box>
          <Rows count={3} />
        </Box>
      </div>
      <Box>
        <Rows count={8} />
      </Box>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-border">{children}</div>;
}

function Rows({ count, bar = false }: { count: number; bar?: boolean }) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 py-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className={bar ? "h-3" : "h-8"} style={bar ? { width: `${90 - i * 10}%` } : undefined} />
        ))}
      </div>
    </div>
  );
}
