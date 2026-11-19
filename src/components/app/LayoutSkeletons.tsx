import { Skeleton } from "@/components/ui/skeleton";
import { Box, Frame, Header, Rows } from "./PageSkeletons";

// Loading screens laid out like the loaded page (owner, 2026-11-17: Competitors, Reports and Compare jumped when the
// page arrived, because their loading screens had a different layout). Same frame and widths as the pages.

/** A strip of 4 score tiles in one bordered box, as on Competitors, Compare and Sources. */
export function Tiles() {
  return (
    <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 bg-surface px-4 pt-4 pb-3.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Competitors: the scores with the chart, then who AI recommends most, then the share and place cards. */
export function CompetitorsSkeleton() {
  return (
    <Frame>
      <Header actions={2} />
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <Tiles />
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-52" />
        </div>
      </div>
      <Box className="gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="p-4">
          <Rows rows={4} height="h-9" />
        </div>
      </Box>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-40" />
        </Box>
        <Box>
          <Skeleton className="h-5 w-40" />
          <Rows rows={3} height="h-8" />
        </Box>
      </div>
    </Frame>
  );
}

/** Reports: the report on the left, saved reports and PDF branding in a narrow column on the right. */
export function ReportsSkeleton() {
  return (
    <Frame>
      <Header actions={3} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_calc(350px*var(--px,1))]">
        <div className="flex flex-col gap-4">
          <Box className="gap-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-full max-w-xl" />
            <Skeleton className="h-16 w-full max-w-2xl" />
            <div className="grid grid-cols-2 gap-4 border-y border-border py-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </Box>
          <Box>
            <Skeleton className="h-5 w-20" />
            <Rows rows={4} height="h-10" />
          </Box>
        </div>
        <div className="flex flex-col gap-4">
          <Box>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12" />
            <Skeleton className="h-9 w-36" />
          </Box>
          <Box>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-12" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-9 w-32" />
          </Box>
        </div>
      </div>
    </Frame>
  );
}

/** Compare: the competitor picker with the versus line, the scores with the chart and AI bars, then the tabs. */
export function CompareSkeleton() {
  return (
    <Frame>
      <Header actions={1} />
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-3 w-48" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-36" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-border p-4">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <Tiles />
        <div className="grid border-t border-border lg:grid-cols-2">
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-44" />
          </div>
          <div className="flex flex-col gap-4 border-t border-border p-4 lg:border-t-0 lg:border-l">
            <Skeleton className="h-5 w-24" />
            <Rows rows={3} height="h-10" />
          </div>
        </div>
      </div>
      <div className="flex gap-5 border-b border-border pb-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <Skeleton className="h-48" />
    </Frame>
  );
}
