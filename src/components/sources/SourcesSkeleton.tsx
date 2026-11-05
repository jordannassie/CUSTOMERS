import { Skeleton } from "@/components/ui/skeleton";

// The Sources page while it loads, shaped like the Check-in conversation (header, question, message cards, right rail)
// so nothing jumps. White blocks on the ground colour, sunken bars inside them.
export function SourcesSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex w-full flex-wrap items-start gap-7 px-4 pt-4 pb-12 sm:px-7 sm:pt-6">
      <div className="mx-auto flex min-w-0 max-w-[820px] flex-[3_1_560px] flex-col gap-[18px]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-40 bg-surface" />
          <Skeleton className="h-4 w-[520px] max-w-full bg-surface" />
        </div>
        <Skeleton className="h-12 w-[420px] max-w-[80%] self-end rounded-[20px] bg-surface" />
        <Card>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-11 rounded-[12px]" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-3.5 rounded-full" style={{ width: `${92 - i * 11}%` }} />
          ))}
        </Card>
        <Card>
          <div className="flex items-center gap-6">
            <Skeleton className="size-[160px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div className="flex w-full min-w-0 flex-[1_1_260px] flex-col gap-3.5 lg:max-w-[340px]">
        <Card>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-xl bg-surface p-6">{children}</div>;
}
