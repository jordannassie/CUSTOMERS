import { cn } from "cn";
import { ExampleTag } from "./example";

export const EXAMPLE_BUSINESS = "Bean House, Orange, CA";

/**
 * A screen from the app (mockup-ui look): a window with the app's breadcrumb bar, then the screen drawn with the app's
 * own styles and made-up data (MVP_SPEC 12.2).
 */
export function ProductFrame({
  page,
  note,
  className,
  children,
}: {
  page: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-28px_rgb(23_23_23/0.28)]", className)}>
      <div className="flex h-11 items-center gap-2 border-b border-border bg-surface px-4 text-[13px]">
        <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-primary-tint text-[10px] font-semibold text-primary-hover">
          B
        </span>
        <span className="font-medium">Bean House</span>
        <span className="text-border" aria-hidden="true">
          /
        </span>
        <span className="text-muted-foreground">{page}</span>
        {note && <span className="hidden text-text-hint sm:inline">· {note}</span>}
        <span className="ml-auto">
          <ExampleTag />
        </span>
      </div>
      {children}
    </div>
  );
}
