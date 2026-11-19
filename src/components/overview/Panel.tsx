import type { ReactNode } from "react";
import Link from "next/link";
import { Triangle } from "lucide-react";
import { cn } from "cn";
import { HelpTip as SharedHelpTip } from "@/components/ui/help-tip";

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
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2">
      <h2 className="flex items-center gap-1.5 text-[length:calc(14px*var(--px,1))] font-semibold tracking-[-0.01em]">
        {title}
        {help && <HelpTip label={`About ${title.toLowerCase()}`} text={help} />}
      </h2>
      {right && <div className="text-xs text-text-hint">{right}</div>}
      {link && (
        <Link href={link.href} className="inline-flex min-h-6 items-center text-[length:calc(12.5px*var(--px,1))] font-medium text-primary hover:underline">
          {link.text}
        </Link>
      )}
    </div>
  );
}

/** A small help icon: the note shows on hover, focus, click or tap (BUG-306). */
export function HelpTip({ label, text }: { label: string; text: string }) {
  return <SharedHelpTip label={label} text={text} contentClassName="max-w-64" />;
}

/** A small up or down triangle in the good or low color, for a change chip. */
export function ChangeMark({ up, className }: { up: boolean; className?: string }) {
  return <Triangle className={cn("size-2 shrink-0 fill-current", !up && "rotate-180", className)} aria-hidden="true" />;
}

/** List rows: hairlines between them, 12px up and down. */
export const ROW = "border-b border-border/60 px-4 py-2.5 last:border-b-0";
