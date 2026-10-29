"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";
import { cn } from "cn";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { CLAIMS } from "@/lib/site-claims";
import type { WhyPanel } from "@/modules/competitors";

type Website = WhyPanel["website"];
/** One side of one measure: the count as written, and its place on the 0 to 100 shape. */
type Side = { label: string; score: number } | null;
type Measure = { key: string; axis: string; title: string; them: Side; you: Side };

const share = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

/** The four measures of a website, each side counted the same way from the one read of each site (D-85). */
function measures(website: Website): Measure[] {
  const checks = (website.compare ?? []).filter((r) => typeof r.them === "boolean");
  const words = (website.compare ?? []).find((r) => typeof r.them === "number");
  const passed = (side: "them" | "you"): Side => {
    if (checks.length === 0 || checks.some((r) => r[side] === null)) return null;
    const n = checks.filter((r) => r[side] === true).length;
    return { label: `${n} of ${checks.length}`, score: share(n, checks.length) };
  };
  const theirClaims = website.claims.filter((r) => !!r.them).length;
  const yourClaims = website.claims.some((r) => r.you === null) ? null : website.claims.filter((r) => !!r.you).length;
  const w = { them: typeof words?.them === "number" ? words.them : null, you: typeof words?.you === "number" ? words.you : null };
  const most = Math.max(1, w.them ?? 0, w.you ?? 0);
  const total = website.services.length;
  const covered = website.services.some((s) => s.yours === null) ? null : website.services.filter((s) => !!s.yours).length;
  return [
    { key: "found", axis: "AI can read", title: "What AI tools can find", them: passed("them"), you: passed("you") },
    {
      key: "topics",
      axis: "Topics",
      title: "Things customers ask about",
      them: { label: `${theirClaims} of ${CLAIMS.length}`, score: share(theirClaims, CLAIMS.length) },
      you: yourClaims === null ? null : { label: `${yourClaims} of ${CLAIMS.length}`, score: share(yourClaims, CLAIMS.length) },
    },
    {
      key: "words",
      axis: "Detail",
      title: "Words on the pages we read",
      them: w.them === null ? null : { label: w.them.toLocaleString("en-US"), score: share(w.them, most) },
      you: w.you === null ? null : { label: w.you.toLocaleString("en-US"), score: share(w.you, most) },
    },
    {
      key: "services",
      axis: "Services",
      title: "Their services you list too",
      them: total > 0 ? { label: `${total} of ${total}`, score: 100 } : null,
      you: covered === null || total === 0 ? null : { label: `${covered} of ${total}`, score: share(covered, total) },
    },
  ];
}

/**
 * The two websites at a glance (B-93): a radar of four measures, their shape in grey and yours in blue on the same
 * 0 to 100 scale, so the gaps show as the parts of their shape yours doesn't cover. Beside it, every measure as written
 * counts. "Not checked" where your site wasn't read the same way.
 */
export function WebsiteScore({ name, website }: { name: string; website: Website }) {
  const rows = measures(website);
  const data = rows.map((m) => ({ axis: m.axis, them: m.them?.score ?? 0, you: m.you?.score ?? 0 }));
  const yoursRead = rows.some((m) => m.you !== null);
  const config = { you: { label: "You", color: "var(--chart-1)" }, them: { label: name, color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <div className="grid items-center gap-6 rounded-md border border-border bg-surface p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="website-score">
      <figure className="m-0 flex flex-col items-center gap-2">
        <ChartContainer config={config} className="aspect-auto h-72 w-full max-w-md" aria-hidden="true">
          <RadarChart data={data} outerRadius="70%" margin={{ top: 12, right: 56, bottom: 12, left: 56 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar dataKey="them" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" fill="var(--chart-2)" fillOpacity={0.12} isAnimationActive={false} />
            {yoursRead && (
              <Radar
                dataKey="you"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="var(--chart-1)"
                fillOpacity={0.22}
                dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            )}
          </RadarChart>
        </ChartContainer>
        <figcaption className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-xs bg-primary/30 ring-2 ring-primary ring-inset" aria-hidden="true" />
            You
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <svg width="16" height="10" aria-hidden="true">
              <rect x="1" y="1" width="14" height="8" rx="2" fill="var(--chart-2)" fillOpacity="0.12" stroke="var(--chart-2)" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>
            <span className="truncate">{name}</span>
          </span>
        </figcaption>
        {!yoursRead && <p className="text-xs text-text-hint">Your website wasn&apos;t read the same way, so only theirs is drawn.</p>}
      </figure>

      <ul className="flex flex-col divide-y divide-border">
        {rows.map((m) => (
          <li key={m.key} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
            <p className="text-xs font-medium text-muted-foreground">{m.title}</p>
            {[
              { who: name, side: m.them, you: false },
              { who: "You", side: m.you, you: true },
            ].map((s) => (
              <span key={s.who} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className={cn("truncate", s.you ? "font-medium text-primary" : "text-foreground")} title={s.who}>
                  {s.who}
                </span>
                <span className="h-1.5 rounded-xs bg-muted" aria-hidden="true">
                  <span className={cn("block h-full rounded-xs", s.you ? "bg-primary" : "bg-competitor-1")} style={{ width: `${s.side ? Math.max(s.side.score > 0 ? 3 : 0, s.side.score) : 0}%` }} />
                </span>
                <span className={cn("text-right tabular-nums", s.you ? "font-semibold text-primary" : "font-medium text-foreground")}>
                  {s.side === null ? "Not checked" : s.side.label}
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
