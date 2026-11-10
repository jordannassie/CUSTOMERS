import { Skeleton } from "@/components/ui/skeleton";

/** Shown while a public page that reads the request (search params, the signed-in user) streams in. */
export function PublicPageSkeleton() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[calc(1120px*var(--px,1))] flex-col gap-6 px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
