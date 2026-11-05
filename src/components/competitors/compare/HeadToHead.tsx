import { GapChart } from "@/components/charts";
import { AiMessage } from "@/components/checkin";
import type { Comparison } from "@/modules/competitors";

const of = (n: number, total: number) => `${n} of ${total} answers`;

/** The serif lead, built only from the two 30-day scores, the standing and the margin on your score (D-64). */
export function gapLead(data: Comparison): string {
  const { you, them, margin } = data.scores;
  const name = data.title;
  if (data.collecting) return `${name} was added recently, so we're still collecting answers to compare you.`;
  if (you === null || them === null || data.standing === null) return `You and ${name} aren't compared yet.`;
  const gap = Math.abs(you - them);
  const points = `${gap} ${gap === 1 ? "point" : "points"}`;
  if (data.standing === "about_same") {
    return gap === 0 ? `You and ${name} are level.` : `You're ${points} apart, inside the margin of error, so you and ${name} are about the same.`;
  }
  const head = data.standing === "behind" ? `You're ${points} behind ${name}.` : `You're ${points} ahead of ${name}.`;
  if (margin === null || margin <= 0) return head;
  const what = data.standing === "behind" ? "The gap" : "Your lead";
  return gap >= 2 * margin ? `${head} ${what} is at least twice the margin of error.` : `${head} ${what} is bigger than the margin of error.`;
}

/** The words under the numbers: "60 pts behind", "About the same" or "Not compared yet" (e2e reads it). */
function gapText(data: Comparison): string {
  const { you, them } = data.scores;
  const gap = you !== null && them !== null ? you - them : null;
  if (gap === null || data.collecting || data.standing === null) return "Not compared yet";
  if (data.standing === "about_same") return "About the same";
  return `${Math.abs(gap)} pts ${data.standing}`;
}

/**
 * C-Compare's first message: the lead, both 30-day scores as big serif numbers (you in brand blue, them in coral), and
 * the gap over the scans both of you were checked.
 */
export function HeadToHead({ data, nextScan }: { data: Comparison; nextScan: string | null }) {
  const { why } = data.panel;
  const { you, them, margin } = data.scores;
  const trend = data.trend;
  return (
    <AiMessage
      place="first"
      leadSize="lg"
      lead={gapLead(data)}
      testId="scorecard"
      aside={
        <div className="flex items-end gap-5" data-testid="why-versus">
          <Score label="You" value={you} sub={of(why.you, why.answers)} tone="you" />
          <Score label={data.title} value={them} sub={of(why.them, why.answers)} tone="them" />
        </div>
      }
    >
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          Gap:{" "}
          <strong className="font-semibold text-foreground" data-testid="gap">
            {gapText(data)}
          </strong>
        </span>
        {margin !== null && <span>Scores are give or take about {Math.round(margin)} pts</span>}
      </p>
      {trend.length === 0 ? null : (
        <figure className="m-0 flex min-w-0 flex-col gap-2" data-testid="pair-trend">
          <GapChart
            labels={trend.map((p) => p.label)}
            you={{ name: "You", values: trend.map((p) => p.you) }}
            rival={{ name: data.title, values: trend.map((p) => p.them) }}
            ariaLabel={`${data.title} and you at each scan. ${trend.map((p) => `${p.label}: you ${p.you ?? "not checked"}, ${data.title} ${p.them ?? "not checked"}`).join("; ")}.`}
          />
          <figcaption className="text-[13px] text-muted-foreground">
            {trend.length === 1
              ? `${data.firstScan ? "Your first scan. " : ""}Each scan adds a point. The trend starts after your next scan${nextScan ? ` on ${nextScan}` : ""}.`
              : "Each point is the share of that scan's answers that named each of you. The numbers are the gap at each scan."}
          </figcaption>
        </figure>
      )}
    </AiMessage>
  );
}

function Score({ label, value, sub, tone }: { label: string; value: number | null; sub: string; tone: "you" | "them" }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="max-w-[9rem] truncate text-[13px] text-muted-foreground" title={label}>
        {label}
      </span>
      <span className={tone === "you" ? "font-serif text-[48px] leading-none text-brand" : "font-serif text-[48px] leading-none text-rival-text"}>
        {value ?? <span className="text-base">Not checked</span>}
      </span>
      <span className="mt-1 text-xs text-muted-foreground tabular-nums">{sub}</span>
    </span>
  );
}

