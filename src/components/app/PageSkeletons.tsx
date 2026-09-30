import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

// Loading states shaped like each loaded page (DESIGN.md), so nothing jumps when the data arrives.

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-5 sm:p-8">
      {children}
    </div>
  );
}

function Header({ actions = 0, lines = 1 }: { actions?: number; lines?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-4 max-w-full", i === lines - 1 ? "w-64" : "w-[560px]")} />
        ))}
      </div>
      {actions > 0 && (
        <div className="flex gap-3">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      )}
    </div>
  );
}

function Box({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("flex flex-col gap-4 rounded-md border border-border bg-surface p-5", className)}>{children}</div>;
}

function Bars({ rows, label = "w-24" }: { rows: number; label?: string }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className={cn("h-4", label)} />
          <Skeleton className="h-1.5 rounded-xs" />
        </div>
      ))}
    </div>
  );
}

function Rows({ rows, height = "h-12" }: { rows: number; height?: string }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="py-3 first:pt-0 last:pb-0">
          <Skeleton className={height} />
        </div>
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <Frame>
      <Header actions={3} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Box className="gap-8">
          <Skeleton className="h-5 w-56" />
          <div className="flex items-center gap-8">
            <Skeleton className="size-36 shrink-0 rounded-full" />
            <div className="flex w-full flex-col gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-full max-w-md" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-40" />
        </Box>
        <Box>
          <Skeleton className="h-5 w-28" />
          <Bars rows={3} />
        </Box>
      </div>
      <Box>
        <Skeleton className="h-5 w-32" />
        <Rows rows={3} height="h-6" />
      </Box>
    </Frame>
  );
}

export function QuestionsSkeleton() {
  return (
    <Frame>
      <Header lines={2} />
      <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2">
        <div className="flex flex-col gap-3 bg-surface p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-1.5 rounded-xs" />
        </div>
        <div className="flex flex-col gap-3 bg-muted p-5">
          <Skeleton className="h-4 w-28 bg-border" />
          <Skeleton className="h-8 w-40 bg-border" />
          <Skeleton className="h-4 w-full bg-border" />
        </div>
      </div>
      <Box>
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-36" />
        </div>
      </Box>
      <Box className="gap-0 p-0">
        <div className="p-5">
          <Skeleton className="h-5 w-36" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid gap-3 border-t border-border px-5 py-4 lg:grid-cols-[minmax(0,1fr)_repeat(3,112px)_36px]">
            <Skeleton className="h-5 max-w-md" />
            {[0, 1, 2].map((m) => (
              <Skeleton key={m} className="hidden h-8 lg:block" />
            ))}
          </div>
        ))}
      </Box>
    </Frame>
  );
}

export function SourcesSkeleton() {
  return (
    <Frame>
      <Header lines={2} />
      <Skeleton className="h-16" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Box>
          <Skeleton className="h-5 w-40" />
          <Rows rows={8} height="h-10" />
        </Box>
        <Box>
          <Skeleton className="h-5 w-36" />
          <Bars rows={5} label="w-40" />
        </Box>
      </div>
    </Frame>
  );
}

export function CompetitorsSkeleton() {
  return (
    <Frame>
      <Header actions={1} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Box>
          <Skeleton className="h-5 w-48" />
          <Rows rows={5} height="h-6" />
        </Box>
        <Box>
          <Skeleton className="h-5 w-44" />
          <Rows rows={2} height="h-10" />
        </Box>
      </div>
      <Box>
        <Skeleton className="h-5 w-40" />
        <Rows rows={5} height="h-8" />
      </Box>
    </Frame>
  );
}

export function OpportunitiesSkeleton() {
  return (
    <Frame>
      <Header />
      <Skeleton className="h-11 w-full sm:h-8 sm:w-80" />
      {Array.from({ length: 3 }, (_, i) => (
        <Box key={i}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-full max-w-md" />
          <Skeleton className="h-16 max-w-[720px]" />
          <Skeleton className="h-9 w-64" />
        </Box>
      ))}
    </Frame>
  );
}

export function SettingsSkeleton() {
  return (
    <Frame>
      <Header />
      {["h-32", "h-24", "h-12"].map((h, i) => (
        <div key={i} className="grid gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-12" />
          </div>
          <Box>
            <Skeleton className="h-9" />
            <Skeleton className={h} />
          </Box>
        </div>
      ))}
    </Frame>
  );
}

export function BillingSkeleton() {
  return (
    <Frame>
      <Header actions={1} />
      <div className="flex max-w-[760px] flex-col gap-6">
        <Skeleton className="h-6 w-72" />
        <Box>
          <Skeleton className="h-5 w-48" />
          <Rows rows={2} height="h-14" />
        </Box>
        <Box>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-56" />
        </Box>
      </div>
    </Frame>
  );
}

export function UsageSkeleton() {
  return (
    <Frame>
      <Header actions={1} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Box>
        <Skeleton className="h-5 w-40" />
        <Rows rows={4} height="h-8" />
      </Box>
    </Frame>
  );
}

export function BuyCreditsSkeleton() {
  return (
    <Frame>
      <Header />
      <div className="flex max-w-[640px] flex-col gap-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
    </Frame>
  );
}

export function ManageCompetitorsSkeleton() {
  return (
    <Frame>
      <Skeleton className="h-5 w-40" />
      <Header lines={2} />
      <Box>
        <Skeleton className="h-9" />
        <Rows rows={4} height="h-10" />
      </Box>
    </Frame>
  );
}
