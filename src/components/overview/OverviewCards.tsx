import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fixHref } from "@/lib/fix-where";
import { STANDING_TEXT, type OverviewCompete } from "@/modules/competitors";
import type { ActionItem } from "@/modules/opportunities/board/service";
import type { OverviewView } from "@/modules/overview";
import type { QuestionTrends } from "@/modules/scanning";
import { colorAt } from "@/lib/series-colors";

// The Overview's cards (dashboard redesign, 2026-10-27), each a short summary with a link to the page that has it all.

// Your standing against that business, in the Competitors page's words: "You're ahead" on a row you beat.
const STANDING = { ahead: "good", behind: "mid", about_same: "secondary" } as const;
const IMPACT = { high: { text: "High", variant: "low" }, medium: { text: "Medium", variant: "mid" }, low: { text: "Low", variant: "secondary" } } as const;
const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

function Block({ title, description, link, children, testId }: { title: string; description?: string; link?: { href: string; text: string }; children: ReactNode; testId?: string }) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {link && (
          <CardAction>
            <Link href={link.href} className="text-sm font-medium text-primary hover:underline">
              {link.text}
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** "Score by AI tool": your 30-day score on each, with the competitors it named most underneath. */
export function ToolScores({ models, context, footer }: { models: OverviewView["models"]; context: OverviewCompete["modelContext"]; footer?: ReactNode }) {
  return (
    <Block title="Score by AI tool" description="Share of each tool's answers that named you" testId="tool-scores">
      <ul className="flex flex-col gap-4">
        {models.map((m) => (
          <li key={m.id} className="flex flex-col gap-1.5" data-testid="model-score">
            <span className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", DOT[m.id] ?? "bg-muted-foreground")} aria-hidden="true" />
                {m.label}
              </span>
              <strong className="tabular-nums">{m.score ?? (m.notChecked ? "Couldn't be checked" : "None")}</strong>
            </span>
            <span className="h-2 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
              <span className="block h-full rounded-xs bg-primary" style={{ width: `${Math.max(m.score ?? 0, m.score ? 2 : 0)}%` }} />
            </span>
            {context[m.id] && <span className="text-xs text-muted-foreground">{context[m.id]}</span>}
          </li>
        ))}
      </ul>
      {footer && <div className="mt-4">{footer}</div>}
    </Block>
  );
}

/** "Where you stand": the top businesses by score, you among them, each with its standing. */
export function WhereYouStand({ rows, lines = [] }: { rows: OverviewCompete["stand"]; lines?: OverviewCompete["lines"] }) {
  // The same color as the business's line on the chart above; grey for one not drawn there.
  const color = (name: string) => {
    const i = lines.findIndex((l) => l.name === name);
    return i >= 0 ? colorAt(i) : "var(--cd-competitor-2)";
  };
  return (
    <Block title="Where you stand" link={{ href: "/competitors", text: "All competitors" }} testId="where-you-stand">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add competitors to see where you stand.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-[minmax(0,9rem)_minmax(2rem,1fr)_2rem_auto] items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className={cn("truncate text-sm", r.isYou && "font-semibold text-primary")} title={r.name}>
                {r.isYou ? `${r.name} (you)` : r.name}
              </span>
              <span className="h-2 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
                <span className="block h-full rounded-xs" style={{ width: `${Math.max(r.score, 1)}%`, background: color(r.name) }} />
              </span>
              <strong className="text-right text-sm tabular-nums">{r.score}</strong>
              <span className="text-right">{r.standing && <Badge variant={STANDING[r.standing]}>{STANDING_TEXT[r.standing]}</Badge>}</span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

/** "Top actions": the three most important open fixes, each with where to apply it. */
export function TopActions({ items, total, wait = null }: { items: ActionItem[]; total: number; wait?: ReactNode }) {
  return (
    <Block title="Top actions" link={total > 0 ? { href: "/actions", text: `All ${total} actions` } : undefined} testId="top-opportunities">
      {/* Between a finished scan and its saved fixes (MVP_SPEC 7.2), as on Actions. */}
      {wait && <div className="mb-3">{wait}</div>}
      {items.length === 0 && wait ? null : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open actions. New ones come from your scans, or from Compare.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <Badge variant={IMPACT[a.impact].variant}>{IMPACT[a.impact].text}</Badge>
              <span className="flex min-w-0 flex-col gap-0.5">
                <Link href={fixHref(a.id)} className="text-sm font-medium hover:underline">
                  {a.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  Apply on {a.whereToApply}
                  {a.evidence ? ` · ${a.evidence.split("\n")[0]}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

/** "Questions that moved": up and down since the scan before, by how many AI tools named you. */
export function QuestionsMoved({ trends }: { trends: QuestionTrends | null }) {
  const moved = [...(trends?.better ?? []), ...(trends?.worse ?? [])].slice(0, 4);
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <Block title="Questions that moved" link={{ href: "/questions", text: "All questions" }} testId="questions-moved">
      {moved.length === 0 ? (
        <p className="text-sm text-muted-foreground">{trends && trends.scans.length > 1 ? "No question moved since the scan before." : "Changes show after your second scan."}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {moved.map((m) => {
            const up = m.change > 0;
            return (
              <li key={m.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className={cn("flex items-center gap-0.5 text-sm font-semibold tabular-nums", up ? "text-good-text" : "text-low-text")}>
                  {up ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />}
                  {up ? "Up" : "Down"}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/questions?q=${m.id}`} className="text-sm hover:underline">
                    {m.prompt}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    Named in {m.now.named} of {m.now.checked} answers now, {m.then.named} of {m.then.checked} on {day(m.thenAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Block>
  );
}

export type SourceLine = { host: string; answers: number; status: "missing" | "partly" | "named" | "never" };
const SOURCE_PILL = {
  missing: { text: "You missing", variant: "mid" },
  partly: { text: "Partly", variant: "secondary" },
  named: { text: "Names you", variant: "good" },
  never: { text: "Never cited", variant: "low" },
} as const;

/** "Where AI gets its answers": the five sites AI used most, and whether they named you. */
export function WhereAiLooks({ rows }: { rows: SourceLine[] }) {
  return (
    <Block title="Where AI gets its answers" link={{ href: "/sources", text: "All sources" }} testId="where-ai-looks">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sites AI used show here after a scan.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <li key={r.host} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <SiteIcon domain={r.host} name={r.host} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{r.host}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {r.answers} {r.answers === 1 ? "answer" : "answers"}
              </span>
              <Badge variant={SOURCE_PILL[r.status].variant}>{SOURCE_PILL[r.status].text}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
