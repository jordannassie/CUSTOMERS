import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6" aria-busy aria-label="Loading agencies">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full max-w-xl rounded-md" />
      <Skeleton className="h-[480px] rounded-md" />
    </div>
  );
}
