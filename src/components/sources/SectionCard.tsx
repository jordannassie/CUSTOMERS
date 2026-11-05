import { cn } from "cn";

type Props = {
  title: string;
  /** Short text or a control on the right of the header row. */
  aside?: React.ReactNode;
  className?: string;
  testId?: string;
  /** Inside a Check-in message card: no frame of its own, the header row lines up with the card's text. */
  bare?: boolean;
  children: React.ReactNode;
};

/** A card with a header row and a hairline under it; an inner 16px card, or frameless inside a message card. */
export function SectionCard({ title, aside, className, testId, bare = false, children }: Props) {
  return (
    <section className={cn("@container min-w-0 overflow-hidden", !bare && "rounded-lg border border-border bg-surface", className)} data-testid={testId}>
      <CardHead title={title} aside={aside} />
      {children}
    </section>
  );
}

/** The header row on its own, for a card split into two halves. */
export function CardHead({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-divider px-5 py-3 sm:px-6">
      <h2 className="font-serif text-[20px] leading-[1.35] font-normal sm:text-[22px]">{title}</h2>
      {aside ? <div className="text-xs text-muted-foreground">{aside}</div> : null}
    </div>
  );
}
