import { Suspense } from "react";
import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { Badge } from "@/components/ui/badge";
import type { SignalRow } from "@/modules/competitors";
import { googleArea, type Area, type CompetitorWhy, type Lead, type SourceRow } from "@/modules/standing";

const LEAD_BADGE: Record<Lead, "mid" | "good" | "secondary" | "outline"> = { them: "mid", you: "good", even: "secondary", unknown: "outline" };

/**
 * Who leads in each place AI looks, with the numbers: a list in the side panel, cards on the comparison page. The Google
 * line waits for the values the page already fetched, and carries Google's attribution (D-73, MVP_SPEC 26).
 */
export function GapAreas({
  why,
  competitorId,
  signals,
  layout = "list",
}: {
  why: CompetitorWhy;
  competitorId: string;
  signals: Promise<SignalRow[]>;
  layout?: "list" | "grid";
}) {
  return (
    <Suspense fallback={<Areas name={why.name} areas={why.areas} layout={layout} />}>
      <AreasWithGoogle why={why} competitorId={competitorId} signals={signals} layout={layout} />
    </Suspense>
  );
}

async function AreasWithGoogle({ why, competitorId, signals, layout }: { why: CompetitorWhy; competitorId: string; signals: Promise<SignalRow[]>; layout: "list" | "grid" }) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  const [listings, quotes, website] = why.areas;
  const google = googleArea(theirs, yours);
  return (
    <div className="flex flex-col gap-1">
      <Areas name={why.name} areas={[listings, quotes, google, website]} layout={layout} />
      {google.lead !== "unknown" && <GoogleAttribution what="Google listing values" />}
    </div>
  );
}

function Areas({ name, areas, layout }: { name: string; areas: Area[]; layout: "list" | "grid" }) {
  const known = areas.filter((a) => a.lead !== "unknown");
  const theirs = known.filter((a) => a.lead === "them").length;
  const yours = known.filter((a) => a.lead === "you").length;
  const leadText = (lead: Lead) => (lead === "them" ? `${name} leads` : lead === "you" ? "You lead" : lead === "even" ? "About even" : "Not known yet");
  return (
    <div className="flex flex-col gap-2.5">
      {known.length > 0 && (
        <p className="text-sm font-medium" data-testid="gap-summary">
          {name} leads in {theirs} of {known.length} places AI looks{yours > 0 ? `, you lead in ${yours}` : ""}.
        </p>
      )}
      <ul
        className={cn(layout === "grid" ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-4" : "flex flex-col divide-y divide-border rounded-md border border-border")}
        data-testid="gap-areas"
      >
        {areas.map((a) => (
          <li key={a.key} className={cn("flex flex-col gap-1.5 px-3 py-2.5", layout === "grid" && "rounded-md border border-border bg-surface")}>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{a.label}</span>
              <Badge variant={LEAD_BADGE[a.lead]}>{leadText(a.lead)}</Badge>
            </span>
            <span className="text-[13px] text-muted-foreground">{a.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The score's answers by the kind of site AI used, as a them against you chart: their count grows left, yours right,
 * on one scale, each named and numbered (2026-10-27). The numbers behind the gap.
 */
export function AnswersBySource({ name, rows }: { name: string; rows: SourceRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No answers from the last 30 days yet.</p>;
  const max = Math.max(1, ...rows.flatMap((r) => [r.them, r.you]));
  const width = (n: number) => `${n === 0 ? 0 : Math.max(3, (n / max) * 100)}%`;
  return (
    <figure className="m-0 flex flex-col gap-2" data-testid="gap-sources">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 text-xs font-medium sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)]">
        <span className="hidden text-muted-foreground sm:block">Where AI looked</span>
        <span className="truncate text-right text-muted-foreground" title={name}>
          {name} named
        </span>
        <span className="text-primary">You named</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col gap-1.5 py-2.5 sm:grid sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-2" data-testid="source-row">
            <span className="flex min-w-0 flex-col">
              <span className="text-sm">{r.label}</span>
              <span className="truncate text-xs text-text-hint">
                {r.answers} {r.answers === 1 ? "answer" : "answers"}
                {r.hosts.length > 0 ? ` · ${r.hosts.join(", ")}` : ""}
              </span>
            </span>
            <span className="grid grid-cols-2 gap-2 sm:contents">
              <span className="flex items-center justify-end gap-2">
                <span className={cn("text-sm tabular-nums", r.them > r.you ? "font-semibold text-foreground" : "text-muted-foreground")}>{r.them}</span>
                <span className="flex h-3 w-full justify-end rounded-xs bg-muted/60" aria-hidden="true">
                  <span className="h-full rounded-xs bg-competitor-1" style={{ width: width(r.them) }} />
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-3 w-full rounded-xs bg-muted/60" aria-hidden="true">
                  <span className="h-full rounded-xs bg-primary" style={{ width: width(r.you) }} />
                </span>
                <span className={cn("text-sm tabular-nums", r.you > r.them ? "font-semibold text-primary" : "text-muted-foreground")}>{r.you}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="text-xs text-text-hint">How many of those answers named each of you. One answer can use more than one kind of site.</figcaption>
    </figure>
  );
}

/** Pages of one website the answers cited, with how many answers used each. */
export function PagesUsed({ label, pages, testId }: { label: string; pages: { path: string; answers: number }[]; testId: string }) {
  if (pages.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {pages.map((p) => (
          <li key={p.path} className="rounded-xs bg-muted px-2 py-0.5 text-[13px]">
            {p.path} <span className="tabular-nums text-text-hint">{p.answers}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
