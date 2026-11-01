import type { ReactNode } from "react";
import Link from "next/link";
import { CircleHelp, Triangle } from "lucide-react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// The Overview's card frame (mockup-ui): a white card, a header row with the title and one thing on the right, a
// hairline, then the body. No shadow.

export function Panel({
  title,
  help,
  right,
  link,
  children,
  testId,
  className,
}: {
  title: string;
  /** A short note behind a small help icon next to the title. */
  help?: string;
  /** Muted text or a control on the right of the header. */
  right?: ReactNode;
  link?: { href: string; text: string };
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-surface", className)} data-testid={testId}>
      <PanelHead title={title} help={help} right={right} link={link} />
      {children}
    </section>
  );
}

export function PanelHead({ title, help, right, link }: { title: string; help?: string; right?: ReactNode; link?: { href: string; text: string } }) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-[18px] py-3">
      <h2 className="flex items-center gap-1.5 text-[14.5px] font-semibold tracking-[-0.01em]">
        {title}
        {help && <HelpTip label={`About ${title.toLowerCase()}`} text={help} />}
      </h2>
      {right && <div className="text-xs text-text-hint">{right}</div>}
      {link && (
        <Link href={link.href} className="text-[12.5px] font-medium text-primary hover:underline">
          {link.text}
        </Link>
      )}
    </div>
  );
}

/** A small help icon that shows a short note on hover or focus. */
export function HelpTip({ label, text }: { label: string; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} className="inline-flex size-4 items-center justify-center rounded-full text-text-hint hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-left font-normal">{text}</TooltipContent>
    </Tooltip>
  );
}

/** A small up or down triangle in the good or low color, for a change chip. */
export function ChangeMark({ up, className }: { up: boolean; className?: string }) {
  return <Triangle className={cn("size-2 shrink-0 fill-current", !up && "rotate-180", className)} aria-hidden="true" />;
}

/** List rows: hairlines between them, 12px up and down. */
export const ROW = "border-b border-border/60 px-[18px] py-3 last:border-b-0";
