import { Skeleton } from "@/components/ui/skeleton";

// Placeholder while the page reads ?error=. A second AuthForm here would put two sets of inputs with the same
// ids on the page until the real form streams in (BUG-029).
export default function AuthFormSkeleton() {
  return (
    <div className="w-full max-w-[420px]" aria-busy="true" aria-label="Loading">
      <Skeleton className="mx-auto mb-8 h-9 w-56 bg-surface" />
      <Skeleton className="h-[480px] w-full rounded-xl bg-surface" />
    </div>
  );
}
