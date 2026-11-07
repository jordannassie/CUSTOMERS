import Link from "next/link";
import { cn } from "cn";

// Check-in conversation pieces (docs/design/files/C-*.dc.html): a page is the user's question on the right, then AI
// message cards on the left, then follow-up chips and the composer. Presentation only; every word in a card comes
// from data the page already loaded.

/** Page frame: the conversation column (max 820px) and the right rail (260 to 340px), wrapping under on a phone. */
export function CheckInLayout({ children, rail, railLabel = "At a glance", className }: {
  children: React.ReactNode;
  rail?: React.ReactNode;
  railLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-wrap items-start gap-7 px-4 pt-4 pb-12 sm:px-7 sm:pt-6", className)}>
      <div className="mx-auto flex min-w-0 max-w-[820px] flex-[3_1_560px] flex-col gap-[18px]">{children}</div>
      {rail ? (
        <aside aria-label={railLabel} className="flex w-full min-w-0 flex-[1_1_260px] flex-col gap-3.5 lg:max-w-[340px]">
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

/** The user's question: a gradient bubble on the right with a 6px corner on its tail. */
export function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[80%] animate-rise self-end rounded-[20px_20px_6px_20px] bg-gradient-user px-[18px] py-3.5 text-[15px] text-white shadow-user [animation-delay:0.1s]">
      {children}
    </p>
  );
}

type Place = "first" | "middle" | "last" | "only";
const CORNERS: Record<Place, string> = {
  first: "rounded-[6px_20px_20px_20px]",
  middle: "rounded-[20px]",
  last: "rounded-[20px_20px_20px_6px]",
  only: "rounded-[6px_20px_20px_6px]",
};

/**
 * One AI message card. The first carries the avatar and a 6px corner by it; the last has its 6px corner at the
 * bottom. `lead` is the serif headline sentence; `children` the plain explanation and the chart.
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
  const withAvatar = place === "first" || place === "only";
  return (
    <div className="flex animate-rise items-start gap-3" style={{ animationDelay: `${0.4 + index * 0.5}s` }} data-testid={testId}>
      {withAvatar ? (
        <span
          className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-gradient-ai font-display font-semibold text-white sm:flex"
          aria-hidden="true"
        >
          C
        </span>
      ) : (
        <span className="hidden w-9 shrink-0 sm:block" aria-hidden="true" />
      )}
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

/** The plain-language line under a lead. */
export function Explain({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-prose text-[15px] leading-relaxed text-ink-2", className)}>{children}</p>;
}

/** Suggested follow-ups: white pills that open other pages. */
export function FollowUps({ items }: { items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Suggested questions" className="flex animate-rise flex-wrap gap-2 sm:pl-12" style={{ animationDelay: "1.2s" }}>
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
