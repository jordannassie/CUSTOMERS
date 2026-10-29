import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Placeholders the size of each streamed Overview block (sections.tsx), so the page does not jump as they arrive.

function CardSkeleton({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <Card aria-hidden="true">
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tall ? <Skeleton className="h-56" /> : Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-6" />)}
      </CardContent>
    </Card>
  );
}

export function HeroSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardContent className="flex flex-col gap-6 py-6 sm:flex-row sm:items-center">
        <Skeleton className="size-36 shrink-0 rounded-full" />
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-full max-w-md" />
          <Skeleton className="h-4 w-36" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <CardSkeleton tall />
      <CardSkeleton rows={3} />
    </div>
  );
}

export function PairSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CardSkeleton rows={4} />
      <CardSkeleton rows={3} />
    </div>
  );
}
