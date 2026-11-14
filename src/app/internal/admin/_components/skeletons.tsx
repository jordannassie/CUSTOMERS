import { Skeleton } from "@/components/ui/skeleton";

// Loading shapes for admin pages: each loading.tsx is the page frame, a header and one of these bodies.

export function PageSkeleton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5" aria-busy aria-label={label}>
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
      <Skeleton className="h-[calc(480px*var(--px,1))] rounded-md" />
    </div>
  );
}

/** A row of numbers, then a main column and a side column. */
export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label={label}>
      <Skeleton className="h-[calc(88px*var(--px,1))] rounded-md" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_calc(360px*var(--px,1))]">
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
      <Skeleton className="h-[calc(104px*var(--px,1))] rounded-md" />
      <Skeleton className="h-[calc(260px*var(--px,1))] rounded-md" />
      <Skeleton className="h-[calc(260px*var(--px,1))] rounded-md" />
    </div>
  );
}
