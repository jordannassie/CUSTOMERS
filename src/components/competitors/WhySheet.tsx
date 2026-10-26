import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { FactList } from "@/components/standing/FactList";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { STANDING_TEXT, type SignalRow, type WhyPanel } from "@/modules/competitors";
import { fixHref } from "@/lib/fix-where";
import { openDays } from "@/lib/google-compare";
import type { Standing } from "@/modules/scanning";

const MAX_QUESTIONS = 4;
const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;
const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

/**
 * One competitor, side by side with you: who AI named more, where (questions, AI tools), the likely reasons it could
 * see and where to fix them. Saved answers only; the Google table waits for the values the page already fetched (D-73).
 * `children` is the leaderboard row that opens it.
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
  const { why, fixes } = panel;
  const lost = why.questionsTheyWin.slice(0, MAX_QUESTIONS);

  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg" data-testid="why-sheet">
        <SheetHeader className="gap-3 border-b border-border pr-10 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {standing && <Badge variant={STANDING_BADGE[standing]}>{STANDING_TEXT[standing]}</Badge>}
          </div>
          {note && <p className="-mt-2 text-xs text-text-hint" data-testid="why-chain-note">{note}. AI named the chain, so these numbers cover all its locations.</p>}
          <SheetDescription className="sr-only">Why AI names {why.name} more or less often than you.</SheetDescription>
          <Versus name={why.name} them={why.them} you={why.you} answers={why.answers} />
        </SheetHeader>

        <div className="flex flex-col gap-7 px-4 py-5 text-sm">
          {lost.length > 0 && (
            <Section heading="Questions they win">
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border" data-testid="questions-they-win">
                {lost.map((q) => (
                  <li key={q.questionId} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1 line-clamp-2">{q.question}</span>
                    <Score them={q.them} you={q.you} />
                  </li>
                ))}
              </ul>
              {why.questionsTheyWin.length > MAX_QUESTIONS && (
                <p className="text-xs text-text-hint">And {why.questionsTheyWin.length - MAX_QUESTIONS} more.</p>
              )}
            </Section>
          )}

          {why.assistants.length > 1 && (
            <Section heading="By AI">
              <ul className="grid grid-cols-3 gap-2">
                {why.assistants.map((a) => (
                  <li key={a.provider} className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("size-2 rounded-full", DOT[a.provider] ?? "bg-muted-foreground")} aria-hidden="true" />
                      {a.assistant}
                    </span>
                    <Score them={a.them} you={a.you} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section heading="Likely reasons">
            {why.reasons.length === 0 ? (
              <p className="text-muted-foreground">Nothing in the answers points to a clear reason yet.</p>
            ) : (
              <FactList facts={why.reasons} testId="why-reasons" openFixes={panel.openFixes} />
            )}
          </Section>

          <Section heading="On Google">
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <GoogleTable name={why.name} competitorId={panel.competitorId} signals={signals} />
            </Suspense>
          </Section>

          {why.youLead.length > 0 && (
            <Section heading="Where you lead">
              <FactList facts={why.youLead} tone="ahead" />
            </Section>
          )}

          {fixes.length > 0 && (
            <Section heading="Fixes for this">
              <ul className="flex flex-col gap-2">
                {fixes.slice(0, 3).map((f) => (
                  <li key={f.id}>
                    <Link
                      href={fixHref(f.id)}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 font-medium hover:border-primary/40 hover:bg-primary-tint"
                    >
                      <span className="min-w-0">{f.title}</span>
                      <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="text-xs text-text-hint">From AI answers in the last 30 days. We can&apos;t see inside the AI tools, so these are likely reasons.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Two bars: how often AI named them and you, out of the same answers. */
function Versus({ name, them, you, answers }: { name: string; them: number; you: number; answers: number }) {
  const pct = (n: number) => (answers > 0 ? Math.max(2, Math.round((n / answers) * 100)) : 0);
  const rows = [
    { label: name, n: them, bar: "bg-competitor-1", text: "text-foreground" },
    { label: "You", n: you, bar: "bg-primary", text: "font-medium text-primary" },
  ];
  return (
    <div className="flex flex-col gap-2" data-testid="why-versus">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className={cn("truncate", r.text)} title={r.label}>
            {r.label}
          </span>
          <span className="h-2 rounded-xs bg-muted" aria-hidden="true">
            <span className={cn("block h-full rounded-xs", r.bar)} style={{ width: `${pct(r.n)}%` }} />
          </span>
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {r.n} of {answers} answers
          </span>
        </div>
      ))}
    </div>
  );
}

/** "12 vs 3": them, then you in blue. */
function Score({ them, you }: { them: number; you: number }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums" aria-label={`Them ${them}, you ${you}`}>
      <span className="font-semibold text-foreground">{them}</span>
      <span className="text-xs text-text-hint">vs</span>
      <span className="font-semibold text-primary">{you}</span>
    </span>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      {children}
    </section>
  );
}

/** Them and you on Google, the leader of each line in bold green. Live values for this view only (D-73). */
async function GoogleTable({ name, competitorId, signals }: { name: string; competitorId: string; signals: Promise<SignalRow[]> }) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  if (!theirs || !yours) return <p className="text-muted-foreground">{"Google details aren't available for both of you right now."}</p>;
  const theirDays = openDays(theirs.hours);
  const yourDays = openDays(yours.hours);
  const days = (n: number | null) => (n === null ? "Not listed" : `${n} a week`);
  const lines: { label: string; them: string; you: string; lead: "them" | "you" | null }[] = [
    { label: "Reviews", them: fmt(theirs.reviewCount), you: fmt(yours.reviewCount), lead: leader(theirs.reviewCount, yours.reviewCount) },
    { label: "Rating", them: theirs.rating?.toFixed(1) ?? "None", you: yours.rating?.toFixed(1) ?? "None", lead: leader(theirs.rating, yours.rating) },
    { label: "Open days", them: days(theirDays), you: days(yourDays), lead: leader(theirDays, yourDays) },
    { label: "Category", them: theirs.categories[0] ?? "None", you: yours.categories[0] ?? "None", lead: null },
  ];
  const lead = "font-semibold text-good-text";
  return (
    <div className="flex flex-col gap-1" data-testid="why-google">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="w-[30%] py-1.5 text-left font-medium">
              <span className="sr-only">On Google</span>
            </th>
            <th className="truncate py-1.5 text-left font-medium">{name}</th>
            <th className="py-1.5 text-left font-medium text-primary">You</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {lines.map((l) => (
            <tr key={l.label}>
              <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">
                {l.label}
              </th>
              <td className={cn("py-2 pr-3 tabular-nums wrap-break-word", l.lead === "them" && lead)}>{l.them}</td>
              <td className={cn("py-2 tabular-nums wrap-break-word", l.lead === "you" && lead)}>{l.you}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <GoogleAttribution what="Google values" />
    </div>
  );
}

const fmt = (n: number | null) => (n === null ? "None" : n.toLocaleString("en-US"));

function leader(them: number | null, you: number | null): "them" | "you" | null {
  if (them === null || you === null || them === you) return null;
  return them > you ? "them" : "you";
}
