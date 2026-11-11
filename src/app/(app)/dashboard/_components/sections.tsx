import { AiMessage, Explain } from "@/components/checkin";
import { NumbersGlance, PicksGlance } from "@/components/overview/checkin/Glance";
import { ActionsMessage, MovedMessage, SourcesMessage } from "@/components/overview/checkin/Messages";
import { ScanLines } from "@/components/overview/checkin/ScanLines";
import { ToolList, ToolRingsChart } from "@/components/overview/checkin/ToolRings";
import { sourceLines, standingSourceLines } from "@/components/overview/OverviewKpis";
import { WaitForFixes } from "@/components/opportunities/WaitForFixes";
import { likelyReason, type getOverviewCompete, type getPickedInstead } from "@/modules/competitors";
import { checkFixes, type getFixesState } from "@/modules/insights";
import { OPEN_ACTION_STATUSES, type getActionsBoard } from "@/modules/opportunities";
import type { getOverview } from "@/modules/overview";
import type { QuestionTrends } from "@/modules/scanning";
import type { getSources } from "@/modules/sources";

// The Overview's Check-in thread (C-Overview), streamed under Suspense boundaries (page.tsx) so the header, the Run scan
// button and the notices show without waiting for the competitor reads. Every sentence is built from these reads.

type Compete = Promise<Awaited<ReturnType<typeof getOverviewCompete>>>;
type Overview = NonNullable<Awaited<ReturnType<typeof getOverview>>>;
type Sources = Awaited<ReturnType<typeof getSources>>;

const OPEN = new Set(OPEN_ACTION_STATUSES);

/** The first messages: how often AI named you (with the rings per tool), the line per scan, where AI looks, what moved. */
export async function ThreadSection({
  overview,
  compete,
  sources,
  picked,
  trends,
  days,
}: {
  overview: Overview;
  compete: Compete;
  sources: Sources;
  picked: Promise<Awaited<ReturnType<typeof getPickedInstead>>>;
  trends: QuestionTrends | null;
  days: number;
}) {
  const [c, p] = await Promise.all([compete, picked]);
  const score = overview.score!;
  const period = c?.period ?? null;
  const lead =
    period && period.answers > 0
      ? `You came up in ${period.named} of the ${period.answers} answers AI gave your customers${days === 30 ? "" : ` in the last ${days} days`}.`
      : score.sentence;
  const timeline = c?.timeline ?? [];
  const lines = c?.lines ?? [];

  return (
    <>
      <AiMessage place="first" index={0}>
        {/* The lead and its explanation beside the rings, top-aligned so the lead starts at the top of the card; the rings
            go under them on a phone. */}
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-[240px] flex-[1_1_300px] flex-col gap-3">
            <h2 className="font-display text-[22px] leading-[1.3] font-semibold sm:text-[26px]">{lead}</h2>
            {/* The 30-day score's own sentence, kept word for word (MVP_SPEC 8.4). Each AI's share is in the rings and the
                tool cards below, so it is not repeated here. */}
            <Explain>
              <span data-testid="score-sentence">{score.sentence}</span>
            </Explain>
          </div>
          <ToolRingsChart models={overview.models} center={period ? { value: String(period.named), caption: `of ${period.answers}` } : { value: `${score.value}`, caption: "of 100" }} />
        </div>
        <ToolList models={overview.models} context={c?.modelContext ?? {}} />
      </AiMessage>

      <AiMessage index={1} lead={trendLead(timeline, lines)}>
        <Explain>
          Share of each scan&apos;s answers that named each business, last {days} days.
          {timeline.length > 1 && " Pick a name to hide or show its line."}
        </Explain>
        <ScanLines timeline={timeline} lines={lines} days={days} earlier={c?.earlierScans ?? false} nextScan={overview.nextScan} />
      </AiMessage>

      <SourcesMessage
        index={2}
        rows={standingSourceLines(c?.sites ?? null, c?.ownSite ?? null, sources?.ownSite.host ?? null) ?? sourceLines(sources)}
        reason={likelyReason(p)}
      />

      <MovedMessage index={3} trends={trends} />
    </>
  );
}

/** "You've climbed from 10 to 17 since Oct 26. Pizza Hut is at 37." from the first and last scans on the chart. */
function trendLead(timeline: { label: string; [k: string]: number | string | null }[], lines: { key: string; name: string; isYou: boolean; latest: number | null }[]): string {
  const you = lines.find((l) => l.isYou);
  const known = you ? timeline.filter((p) => typeof p[you.key] === "number") : [];
  if (!you || known.length < 2) return "Here is your visibility at each scan.";
  const first = known[0][you.key] as number;
  const last = known.at(-1)![you.key] as number;
  const since = known[0].label;
  const moved =
    last > first ? `You've climbed from ${first} to ${last} since ${since}.` : last < first ? `You've slipped from ${first} to ${last} since ${since}.` : `You've held at ${last} since ${since}.`;
  const leader = lines.find((l) => !l.isYou && l.latest !== null);
  return leader && leader.latest! > last ? `${moved} ${leader.name} is at ${leader.latest}.` : moved;
}

/** The last message: the top open fixes. */
export async function ActionsSection({
  businessId,
  board,
  fixes,
}: {
  businessId: string;
  board: Promise<Awaited<ReturnType<typeof getActionsBoard>>>;
  fixes: Promise<Awaited<ReturnType<typeof getFixesState>>>;
}) {
  const [b, f] = await Promise.all([board, fixes]);
  const open = (b?.items ?? []).filter((a) => OPEN.has(a.status));
  return (
    <ActionsMessage
      index={4}
      items={open.slice(0, 3)}
      total={open.length}
      wait={f?.pending ? <WaitForFixes businessId={businessId} check={checkFixes} compact /> : null}
    />
  );
}

/** The rail's numbers and "Who AI picks most", once the competitor reads are in. */
export async function RailSection({ compete, sources }: { compete: Compete; sources: Sources }) {
  const c = await compete;
  return (
    <>
      <NumbersGlance compete={c} sources={sources} />
      <PicksGlance rows={c?.stand ?? []} lines={c?.lines ?? []} timeline={c?.timeline ?? []} />
    </>
  );
}
