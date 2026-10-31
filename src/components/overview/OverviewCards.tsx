import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, FileText, Globe, MapPin, Share2, Star } from "lucide-react";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { fixHref } from "@/lib/fix-where";
import type { ActionItem } from "@/modules/opportunities/board/service";
import type { QuestionTrends } from "@/modules/scanning";
import { Panel, ROW } from "./Panel";

// The Overview's lower cards (mockup-ui), each a short summary with a link to the page that has it all.

const CHIP = "inline-flex h-5 shrink-0 items-center rounded-sm px-1.5 text-[11.5px] font-medium whitespace-nowrap";
const IMPACT = {
  high: { text: "High", tone: "bg-low-bg text-low-text" },
  medium: { text: "Medium", tone: "bg-mid-bg text-mid-text" },
  low: { text: "Low", tone: "bg-muted text-muted-foreground" },
} as const;
const PLACE_ICON: Record<ActionItem["place"], typeof Globe> = { website: Globe, google_listing: MapPin, review_sites: Star, social: Share2, content: FileText };

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-[18px] py-6 text-[13px] text-muted-foreground">{children}</p>;
}

/** "Top actions": the most important open fixes, each with where to apply it. */
export function TopActions({ items, total, wait = null }: { items: ActionItem[]; total: number; wait?: ReactNode }) {
  return (
    <Panel title="Top actions" link={total > 0 ? { href: "/actions", text: `All ${total} actions` } : undefined} testId="top-opportunities">
      {/* Between a finished scan and its saved fixes (MVP_SPEC 7.2), as on Actions. */}
      {wait && <div className="border-b border-border/60 px-[18px] py-3">{wait}</div>}
      {items.length === 0 && wait ? null : items.length === 0 ? (
        <Empty>No open actions. New ones come from your scans, or from Compare.</Empty>
      ) : (
        <ul className="flex flex-col">
          {items.map((a) => {
            const Icon = PLACE_ICON[a.place] ?? Globe;
            const why = a.evidence?.split("\n")[0];
            return (
              <li key={a.id} className={cn(ROW, "grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3")}>
                <span className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground" aria-hidden="true">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={fixHref(a.id)} className="truncate text-[13px] font-medium hover:underline">
                    {a.title}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground" title={why ?? undefined}>
                    Apply on {a.whereToApply}
                    {why ? ` · ${why}` : ""}
                  </span>
                </span>
                <span className={cn(CHIP, IMPACT[a.impact].tone)}>{IMPACT[a.impact].text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** "Questions that moved": up and down since the scan before, by how many answers named you. */
export function QuestionsMoved({ trends }: { trends: QuestionTrends | null }) {
  const moved = [...(trends?.better ?? []), ...(trends?.worse ?? [])].slice(0, 4);
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <Panel title="Questions that moved" right={moved.length > 0 ? "Since the scan before" : undefined} link={{ href: "/questions", text: "All questions" }} testId="questions-moved">
      {moved.length === 0 ? (
        <Empty>{trends && trends.scans.length > 1 ? "No question moved since the scan before." : "Changes show after your second scan."}</Empty>
      ) : (
        <ul className="flex flex-col">
          {moved.map((m) => {
            const up = m.change > 0;
            const tone = up ? "text-good-text" : "text-low-text";
            return (
              <li key={m.id} className={cn(ROW, "grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3")}>
                <span className={cn("flex size-7 items-center justify-center rounded-md", up ? "bg-good-bg" : "bg-low-bg", tone)}>
                  {up ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />}
                  <span className="sr-only">{up ? "Up" : "Down"}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/questions?q=${m.id}`} className="truncate text-[13px] font-medium hover:underline" title={m.prompt}>
                    {m.prompt}
                  </Link>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-hint tabular-nums">
                    <span>
                      Named in {m.then.named} of {m.then.checked} on {day(m.thenAt)}
                    </span>
                    <ChevronRight className="size-3" aria-hidden="true" />
                    <span className={cn("font-medium", tone)}>
                      {m.now.named} of {m.now.checked} now
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export type SourceLine = { host: string; answers: number; status: "missing" | "partly" | "named" | "never" };
const SOURCE_CHIP = {
  missing: { text: "Skips you", tone: "bg-low-bg text-low-text" },
  partly: { text: "Names you sometimes", tone: "bg-mid-bg text-mid-text" },
  named: { text: "Names you", tone: "bg-good-bg text-good-text" },
  never: { text: "Never cited", tone: "bg-mid-bg text-mid-text" },
} as const;

/** "Where AI gets its answers": the five sites AI used most, and whether those answers named you. */
export function WhereAiLooks({ rows }: { rows: SourceLine[] }) {
  return (
    <Panel title="Where AI gets its answers" help="The websites AI used most in its answers over the last 30 days, and whether those answers named you." link={{ href: "/sources", text: "All sources" }} testId="where-ai-looks">
      {rows.length === 0 ? (
        <Empty>Sites AI used show here after a scan.</Empty>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.host} className={cn(ROW, "grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3")}>
              <SiteIcon domain={r.host} name={r.host} size="sm" />
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span className="max-w-full truncate text-[13px] font-medium">{r.host}</span>
                <span className={cn(CHIP, SOURCE_CHIP[r.status].tone)}>{SOURCE_CHIP[r.status].text}</span>
              </span>
              <span className="flex flex-col items-end text-right">
                <strong className="text-[13.5px] font-semibold tabular-nums">{r.answers}</strong>
                <span className="text-[11.5px] text-text-hint">{r.answers === 1 ? "answer" : "answers"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
