import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6" aria-busy aria-label="Loading leads">
      <Skeleton className="h-16 w-48 rounded-md" />
      <Skeleton className="h-14 w-full max-w-3xl rounded-md" />
      <Skeleton className="h-[480px] rounded-md" />
    </div>
  );
}
