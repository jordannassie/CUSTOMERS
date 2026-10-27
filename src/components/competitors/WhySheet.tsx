import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";
import { FactList } from "@/components/standing/FactList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { STANDING_TEXT, type SignalRow, type WhyPanel } from "@/modules/competitors";
import type { Standing } from "@/modules/scanning";
import { GapAreas } from "./compare/Gap";
import { Versus } from "./compare/Versus";

const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;
const TOP_REASONS = 3;

/**
 * The short "why" for one competitor (B-93): the two bars, who leads in each place AI looks, and the top reasons. The
 * full evidence, the website check and the Google table are on its comparison page. `children` is the leaderboard row
 * that opens it.
 */
export function WhySheet({
  panel,
  title,
  note,
  standing,
  signals,
  defaultOpen = false,
  children,
}: {
  panel: WhyPanel;
  /** The row's name: "Bennu Coffee (all locations)" for a chain. */
  title: string;
  /** "You track Bennu Coffee on Congress" for a chain row. */
  note?: string | null;
  standing: Standing | null;
  signals: Promise<SignalRow[]>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { why, website } = panel;
  const href = `/competitors/${panel.competitorId}`;

  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg" data-testid="why-sheet">
        <SheetHeader className="gap-3 border-b border-border pr-10 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {standing && <Badge variant={STANDING_BADGE[standing]}>{STANDING_TEXT[standing]}</Badge>}
          </div>
          {note && (
            <p className="-mt-2 text-xs text-text-hint" data-testid="why-chain-note">
              {note}. AI named the chain, so these numbers cover all its locations.
            </p>
          )}
          <SheetDescription className="sr-only">Why AI names {why.name} more or less often than you.</SheetDescription>
          <Versus name={why.name} them={why.them} you={why.you} answers={why.answers} />
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 py-5 text-sm">
          <GapAreas why={why} competitorId={panel.competitorId} signals={signals} />

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Top likely reasons</h3>
            {why.reasons.length === 0 ? (
              <p className="text-muted-foreground">{"The answers don't point to a clear reason yet."}</p>
            ) : (
              <FactList facts={why.reasons.slice(0, TOP_REASONS)} testId="why-reasons" />
            )}
          </section>

          <Link
            href={`${href}?tab=websites`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-[13px] hover:border-primary/40 hover:bg-primary-tint"
            data-testid="website-status"
          >
            <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {website.checked ? `Their website: checked` : website.checking ? "Their website: being checked now" : "Their website: not checked yet"}
              {website.domain ? <span className="text-muted-foreground"> · {website.domain}</span> : null}
            </span>
            <span className="shrink-0 font-medium text-primary">{website.checked || website.checking ? "See it" : "Check it"}</span>
          </Link>

          <Button asChild className="w-full" data-testid="open-comparison">
            <Link href={href}>
              Open full comparison
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-xs text-text-hint">From AI answers in the last 30 days. We can&apos;t see inside the AI tools, so these are likely reasons.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
