import { Skeleton } from "@/components/ui/skeleton";

// Placeholder while the page reads ?error=. A second AuthForm here would put two sets of inputs with the same
// ids on the page until the real form streams in (BUG-029).
export default function AuthFormSkeleton() {
  return (
    <div className="w-full max-w-[420px]" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-14 w-40 mx-auto mb-8" />
      <Skeleton className="h-[480px] w-full rounded-2xl" />
    </div>
  );
}
