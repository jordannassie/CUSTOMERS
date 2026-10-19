import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

/**
 * The one admin empty state. Say which kind it is: nothing exists yet ("No agencies yet", what makes one appear), or
 * nothing matches the filter ("No agencies match", how to see the rest). Without a title it is a short note for a
 * section of a detail page.
 */
export default function AdminEmpty({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-testid="admin-empty"
      className={cn(
        "flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-surface px-6 text-center",
        title ? "py-12" : "py-6",
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-6 text-text-hint" />}
      {title && <p className="text-[15px] font-medium">{title}</p>}
      {children && <div className="max-w-md text-[14px] text-muted-foreground">{children}</div>}
    </div>
  );
}
