import { PageContainer } from "@/components/app/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-44" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-[640px]" />
        </div>
      </div>
    </PageContainer>
  );
}
