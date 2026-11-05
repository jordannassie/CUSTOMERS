import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, FileText, Globe, MapPin, Share2, Star } from "lucide-react";
import { cn } from "cn";
import { CHART, RankedBars } from "@/components/charts";
import { AiMessage, Explain, StatusPill, type PillTone } from "@/components/checkin";
import { fixHref } from "@/lib/fix-where";
import type { ActionItem } from "@/modules/opportunities/board/service";
import type { QuestionTrends } from "@/modules/scanning";
import type { SourceLine } from "../OverviewKpis";

// The Overview's later messages in the Check-in thread (C-Overview), each a short summary with a link to the page
// that has it all. Every number comes from the page's own reads.

type Place = "middle" | "last";

const MORE = "text-sm font-semibold text-brand underline-offset-4 hover:underline";

const STATUS: Record<SourceLine["status"], { text: string; color: string }> = {
  named: { text: "Names you", color: CHART.you },
  partly: { text: "Names you sometimes", color: CHART.you },
  missing: { text: "Skips you", color: CHART.rival },
  never: { text: "Your site, never cited", color: CHART.rival },
};

/** "Where AI gets its answers": the sites AI used most and whether those answers named you, plus the likely reason. */
export function SourcesMessage({ rows, reason, index, place = "middle" }: { rows: SourceLine[]; reason: string | null; index: number; place?: Place }) {
  const top = rows.find((r) => r.status !== "never");
  const lead = top ? `AI used ${top.host} more than any other website, in ${top.answers} ${top.answers === 1 ? "answer" : "answers"}.` : "Where AI gets its answers";
  return (
    <AiMessage index={index} place={place} lead={lead} testId="where-ai-looks">
      {reason ? (
        <Explain>
          <span data-testid="likely-reason">{reason}</span>
        </Explain>
      ) : null}
      {rows.length === 0 ? (
        <Explain>Sites AI used show here after a scan.</Explain>
      ) : (
        <RankedBars
          ariaLabel={`Websites AI used most: ${rows.map((r) => `${r.host} ${r.answers} answers, ${STATUS[r.status].text.toLowerCase()}`).join("; ")}.`}
          headers={{ label: "Website", value: "Answers that used it" }}
          rows={rows.map((r) => ({ key: r.host, label: r.host, sub: STATUS[r.status].text, value: r.answers, color: STATUS[r.status].color }))}
        />
      )}
      <Link href="/sources" className={MORE}>
        All sources
      </Link>
    </AiMessage>
  );
}

/** "Questions that moved": up and down since the scan before, by how many answers named you. */
export function MovedMessage({ trends, index }: { trends: QuestionTrends | null; index: number }) {
  const moved = [...(trends?.better ?? []), ...(trends?.worse ?? [])].slice(0, 4);
  const up = trends?.better.length ?? 0;
  const down = trends?.worse.length ?? 0;
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lead =
    moved.length === 0
      ? "Questions that moved"
      : `Since the scan before, ${up} ${up === 1 ? "question" : "questions"} named you more often and ${down} less often.`;
  return (
    <AiMessage index={index} lead={lead} testId="questions-moved">
      {moved.length === 0 ? (
        <Explain>{trends && trends.scans.length > 1 ? "No question moved since the scan before." : "Changes show after your second scan."}</Explain>
      ) : (
        <ul className="flex flex-col">
          {moved.map((m) => {
            const better = m.change > 0;
            const tone = better ? "text-good-text" : "text-danger";
            return (
              <li key={m.id} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 border-t border-track py-3 first:border-t-0">
                <span className={cn("flex size-8 items-center justify-center rounded-full", better ? "bg-good-bg" : "bg-low-bg", tone)}>
                  {better ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
                  <span className="sr-only">{better ? "Up" : "Down"}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/questions?q=${m.id}`} className="truncate text-sm font-semibold hover:underline" title={m.prompt}>
                    {m.prompt}
                  </Link>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground tabular-nums">
                    <span>
                      Named in {m.then.named} of {m.then.checked} on {day(m.thenAt)}
                    </span>
                    <ChevronRight className="size-3" aria-hidden="true" />
                    <span className={cn("font-semibold", tone)}>
                      {m.now.named} of {m.now.checked} now
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/questions" className={MORE}>
        All questions
      </Link>
    </AiMessage>
  );
}

const IMPACT: Record<ActionItem["impact"], { text: string; tone: PillTone }> = {
  high: { text: "High impact", tone: "suggested" },
  medium: { text: "Medium impact", tone: "progress" },
  low: { text: "Low impact", tone: "dismissed" },
};
const PLACE_ICON: Record<ActionItem["place"], typeof Globe> = { website: Globe, google_listing: MapPin, review_sites: Star, social: Share2, content: FileText };

/** "Top actions": the most important open fixes, each with where to apply it. The last message in the thread. */
export function ActionsMessage({ items, total, wait = null, index }: { items: ActionItem[]; total: number; wait?: ReactNode; index: number }) {
  const lead =
    items.length === 0 ? "Top actions" : items.length === 1 ? "This would move you up the fastest:" : `These ${items.length} would move you up the fastest:`;
  return (
    <AiMessage index={index} place="last" lead={lead} testId="top-opportunities">
      {wait && <div className="rounded-lg bg-muted px-4 py-3">{wait}</div>}
      {items.length === 0 && wait ? null : items.length === 0 ? (
        <Explain>No open actions. New ones come from your scans, or from Compare.</Explain>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((a) => {
            const Icon = PLACE_ICON[a.place] ?? Globe;
            const why = a.evidence?.split("\n")[0];
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true">
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
                  <Link href={fixHref(a.id)} className="font-semibold hover:underline">
                    {a.title}
                  </Link>
                  <span className="text-sm leading-normal text-muted-foreground">
                    Apply on {a.whereToApply}
                    {why ? ` · ${why}` : ""}
                  </span>
                </span>
                <StatusPill tone={IMPACT[a.impact].tone}>{IMPACT[a.impact].text}</StatusPill>
              </li>
            );
          })}
        </ul>
      )}
      {total > 0 && (
        <Link href="/actions" className={MORE}>
          All {total} actions
        </Link>
      )}
    </AiMessage>
  );
}
