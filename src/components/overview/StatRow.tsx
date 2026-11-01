import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

/**
 * One of the three numbers beside the Overview's score (mockup-ui, the owner's pick): an icon in a tinted square, the
 * label with its period, the value, and one short line under it.
 */
export function StatRow({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "mid";
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 bg-surface px-[18px] py-4" data-testid={testId}>
      {/* Hidden on a tablet, where the three sit side by side and the words need the room. */}
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-tint text-primary sm:hidden xl:grid" aria-hidden="true">
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-xl leading-tight font-semibold tracking-[-0.02em] tabular-nums", tone === "mid" && "text-mid-text")}>{value}</span>
        {sub && <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
