import { ShowGoogle } from "@/components/app/ShowGoogle";
import { AiMessage, Explain } from "@/components/checkin";
import { BubbleChart, type Bubble } from "@/components/charts";
import type { SignalRow, TableRow } from "@/modules/competitors";
import type { SaveWebsiteAction } from "../CompetitorWebsite";
import { SignalsTable } from "../SignalsTable";

type Edit = { businessId: string; save: SaveWebsiteAction };

/** The bubbles: businesses Google rated, with a review count and an AI score to plot. Live values, never stored (D-73). */
function bubbles(signals: SignalRow[], rows: TableRow[]): Bubble[] {
  return signals.flatMap((s) => {
    const row = rows.find((r) => (s.isYou ? r.isYou : !r.isYou && r.name === s.name));
    const g = s.signals;
    if (!row || row.score === null || !g || g.rating === null || g.reviewCount === null || s.status !== "linked") return [];
    return [{ name: s.isYou ? `${s.name} (you)` : s.name, x: g.rating, y: row.score, size: g.reviewCount, color: row.color, emphasis: s.isYou }];
  });
}

const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;

/** Sentences from the plotted values only. */
function words(points: Bubble[]): { lead: string; explain: string } {
  const you = points.find((p) => p.emphasis);
  const others = points.filter((p) => !p.emphasis);
  const plain = { lead: "Here's how Google ratings line up with AI visibility.", explain: "Each bubble is a business. Bubble size is the number of Google reviews." };
  if (points.length < 2) return { lead: "Here's what Google shows for each of you.", explain: "" };
  if (!you || others.length === 0) return plain;
  if (others.every((o) => you.x > o.x)) {
    const ahead = others.filter((o) => o.y > you.y).length;
    return {
      lead: "The odd part: customers rate you higher than anyone on this list.",
      explain: `Your ${you.x.toFixed(1)} stars across ${you.size.toLocaleString("en-US")} Google reviews is the best of the ${points.length}.${
        ahead > 0 ? ` Even so, AI names ${ahead === 1 ? "one of them" : `${ahead} of them`} more often than you.` : ""
      } Bubble size is the number of reviews.`,
    };
  }
  return plain;
}

// C-Competitors, Google card. Google is asked only after "Show Google details" (?google=1); before that the card holds
// the existing prompt. Then the bubble chart (rating against visibility, size by reviews) and the existing table.
export async function GoogleCard({
  signals,
  rows,
  pickBranch,
  edit,
  index,
}: {
  signals: Promise<SignalRow[]> | null;
  rows: TableRow[];
  pickBranch: boolean;
  edit: Edit;
  index: number;
}) {
  if (!signals) {
    return (
      <AiMessage lead="Want to see how customers rate each of you on Google?" index={index}>
        <ShowGoogle href="/competitors?google=1" text="Ratings, review counts, categories and hours for you and each competitor, live from Google." />
      </AiMessage>
    );
  }
  const loaded = await signals;
  const points = bubbles(loaded, rows);
  const text = words(points);
  const quadrant = points.length >= 3 ? { xMin: avg(points.map((p) => p.x)), yMax: avg(points.map((p) => p.y)), label: "Loved by customers, missed by AI" } : undefined;
  return (
    <AiMessage lead={text.lead} index={index} testId="google-card">
      {points.length >= 2 && (
        <>
          <Explain>{text.explain}</Explain>
          <BubbleChart
            points={points}
            quadrant={quadrant}
            ariaLabel={`Bubble chart of Google rating against AI visibility. ${points.map((p) => `${p.name}: ${p.x.toFixed(1)} stars, ${p.size} reviews, visibility ${p.y}`).join(". ")}.`}
          />
        </>
      )}
      <SignalsTable rows={loaded} pickBranch={pickBranch} edit={edit} />
    </AiMessage>
  );
}
