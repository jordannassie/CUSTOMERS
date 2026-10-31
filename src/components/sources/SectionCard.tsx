import { cn } from "cn";

type Props = {
  title: string;
  /** Short text or a control on the right of the header row. */
  aside?: React.ReactNode;
  className?: string;
  testId?: string;
  children: React.ReactNode;
};

/** A white card with a header row and a hairline under it (mockup-ui), used by every block on the Sources page. */
export function SectionCard({ title, aside, className, testId, children }: Props) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-surface", className)} data-testid={testId}>
      <CardHead title={title} aside={aside} />
      {children}
    </section>
  );
}

/** The header row on its own, for a card split into two halves. */
export function CardHead({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:px-[18px]">
      <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">{title}</h2>
      {aside ? <div className="text-xs text-text-hint">{aside}</div> : null}
    </div>
  );
}
