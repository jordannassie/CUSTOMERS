import { Skeleton } from "@/components/ui/skeleton";

/** Shown while Stripe's form script loads, so the card area is never blank (BUG-107). */
export function StripeFormLoading() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-3">
      <span className="sr-only">Loading the card form…</span>
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-24" />
    </div>
  );
}
