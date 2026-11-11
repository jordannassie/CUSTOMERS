import Link from "next/link";
import { cn } from "cn";

// Check-in conversation pieces (docs/design/files/C-*.dc.html): a page is the user's question on the right, then AI
// message cards on the left, then follow-up chips and the composer. Presentation only; every word in a card comes
// from data the page already loaded.

/**
 * Page frame: the conversation column takes all the room the rail leaves (up to 1120px), and the right rail is a fixed
 * 280px beside it on wide screens; below 1280px the rail goes under the column.
 */
export function CheckInLayout({ children, rail, railLabel = "At a glance", className }: {
  children: React.ReactNode;
  rail?: React.ReactNode;
  railLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-wrap items-start gap-6 px-4 pt-4 pb-12 sm:px-7 sm:pt-6", className)}>
      <div className="mx-auto flex min-w-0 max-w-[1120px] flex-[1_1_560px] flex-col gap-[18px]">{children}</div>
      {rail ? (
        <aside aria-label={railLabel} className="flex w-full min-w-0 flex-col gap-3.5 xl:w-[280px] xl:flex-none">
          {rail}
        </aside>
      ) : null}
    </div>
  );
}

/** The thin rule with a note in the middle, for example "Monthly check-in, from your Oct 17 scan". */
export function DayRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="text-center">{children}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

type Place = "first" | "middle" | "last" | "only";
// Every message card has the same 20px corners: the cards line up with the page title, no avatar beside them.
const CORNERS: Record<Place, string> = {
  first: "rounded-xl",
  middle: "rounded-xl",
  last: "rounded-xl",
  only: "rounded-xl",
};

/**
 * One AI message card, full width of the conversation column so it lines up with the page title. `place` is kept
 * for callers; every card has the same corners. `lead` is the headline sentence; `children` the explanation and chart.
 */
export function AiMessage({
  place = "middle",
  lead,
  leadSize = "md",
  aside,
  children,
  index = 0,
  className,
  testId,
}: {
  place?: Place;
  lead?: React.ReactNode;
  leadSize?: "lg" | "md";
  /** Beside the lead on wide screens (the radial bars, the two big numbers). */
  aside?: React.ReactNode;
  children?: React.ReactNode;
  /** Position in the thread, for the staggered rise. */
  index?: number;
  className?: string;
  testId?: string;
}) {
  return (
    <div className="flex animate-rise items-stretch" style={{ animationDelay: `${0.4 + index * 0.5}s` }} data-testid={testId}>
      <section className={cn("flex min-w-0 flex-1 flex-col gap-3.5 bg-card px-5 py-[22px] sm:px-6", CORNERS[place], className)}>
        {lead || aside ? (
          <div className="flex flex-wrap items-start gap-6">
            {lead ? (
              <h2 className={cn("min-w-[240px] flex-[1_1_300px] font-display font-semibold", leadSize === "lg" ? "text-[22px] leading-[1.3] sm:text-[26px]" : "text-[20px] leading-[1.35] sm:text-[22px]")}>
                {lead}
              </h2>
            ) : null}
            {aside}
          </div>
        ) : null}
        {children}
      </section>
    </div>
  );
}

/**
 * Two message cards side by side when the conversation column has room (700px or more of its own width), one under the
 * other when it does not. Measured on the column, so it also works when the right rail wraps under it. Paired cards
 * stretch to the same height.
 */
export function CardPair({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container">
      <div className="grid gap-[18px] @min-[700px]:grid-cols-2">{children}</div>
    </div>
  );
}

/** The plain-language line under a lead. */
export function Explain({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-prose text-[15px] leading-relaxed text-ink-2", className)}>{children}</p>;
}

/** Suggested follow-ups: white pills that open other pages. */
export function FollowUps({ items }: { items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Suggested questions" className="flex animate-rise flex-wrap gap-2" style={{ animationDelay: "1.2s" }}>
      {items.map((i) => (
        <Link
          key={i.href + i.label}
          href={i.href}
          className="inline-flex min-h-11 items-center rounded-full border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors hover:border-brand hover:text-brand-strong"
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
