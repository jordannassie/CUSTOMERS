import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A white card with a header row (mockup-ui): the title with a small help icon, controls on the right, a hairline,
 * then the body. `flush` drops the body's padding, for a table that runs edge to edge. `footer` is a quiet note at the
 * bottom, above a hairline.
 */
export function SectionCard({
  title,
  help,
  actions,
  footer,
  flush = false,
  className,
  bodyClassName,
  children,
  testId,
}: {
  title: ReactNode;
  /** What the card shows, in a sentence or two, behind the help icon. */
  help?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card", className)} data-testid={testId}>
      <CardHead title={title} help={help} actions={actions} />
      <div className={cn("min-w-0 flex-1", !flush && "px-[18px] py-4", bodyClassName)}>{children}</div>
      {footer ? <div className="border-t border-border px-[18px] py-2.5 text-xs text-text-hint">{footer}</div> : null}
    </section>
  );
}

/** The header row on its own, for a card that lays out its own body. */
export function CardHead({ title, help, actions, className }: { title: ReactNode; help?: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-[54px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-[18px] py-3", className)}>
      {/* The help icon sits beside the heading, not in it, so the heading's name stays just the title. */}
      <div className="flex min-w-0 items-center gap-1.5">
        <h2 className="min-w-0 text-[14.5px] font-semibold tracking-[-0.01em]">{title}</h2>
        {help ? <Help text={help} /> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Help({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-full text-text-hint outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`About this: ${text}`}
        >
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72 font-normal">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
