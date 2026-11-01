import { Skeleton } from "@/components/ui/skeleton";

// Loading shapes for admin pages: each loading.tsx is the page frame, a header and one of these bodies.

export function PageSkeleton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6" aria-busy aria-label={label}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {children}
    </div>
  );
}

/** A filter or search bar over a table. */
export function ListSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label={label}>
      <Skeleton className="h-10 w-full max-w-xl rounded-md" />
      <Skeleton className="h-[480px] rounded-md" />
    </div>
  );
}

/** A row of numbers, then a main column and a side column. */
export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label={label}>
      <Skeleton className="h-[88px] rounded-md" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    </div>
  );
}

/** A row of numbers over stacked sections (Overview, Usage). */
export function ReportSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label={label}>
      <Skeleton className="h-[104px] rounded-md" />
      <Skeleton className="h-[260px] rounded-md" />
      <Skeleton className="h-[260px] rounded-md" />
    </div>
  );
}
