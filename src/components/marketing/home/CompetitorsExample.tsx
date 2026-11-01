import { LeaderTable } from "@/components/competitors/LeaderTable";
import { colorAt } from "@/lib/series-colors";
import type { TableRow } from "@/modules/competitors";
import { ProductFrame } from "./ProductFrame";

const row = (r: Partial<TableRow> & Pick<TableRow, "name" | "score" | "rank" | "color">): TableRow => ({
  isYou: false,
  note: null,
  topReason: null,
  spark: [],
  change: null,
  changeKnown: false,
  byModel: {},
  standing: null,
  collecting: false,
  competitorId: null,
  domain: null,
  ...r,
});

// The made-up coffee shop's leaderboard (MVP_SPEC 12.2), drawn with the app's own table (mockup-ui).
const ROWS: TableRow[] = [
  row({ rank: 1, name: "Daily Grind", score: 81, color: colorAt(1), standing: "behind", byModel: { openai: 88, anthropic: 75, perplexity: 80 }, topReason: "AI used yelp.com when it picked them" }),
  row({ rank: 2, name: "Bean House", isYou: true, score: 62, color: colorAt(0), byModel: { openai: 75, anthropic: 58, perplexity: 53 } }),
  row({ rank: 3, name: "Brew Lab", score: 57, color: colorAt(2), standing: "about_same", byModel: { openai: 60, anthropic: 52, perplexity: 59 }, topReason: "AI quotes their menu page more" }),
  row({ rank: 4, name: "Cup & Co", score: 22, color: colorAt(3), standing: "ahead", byModel: { openai: 25, anthropic: 14, perplexity: 27 }, topReason: "More recent Google reviews" }),
];

const ALSO = [
  { name: "Orange Roastery", answers: 5 },
  { name: "Plaza Coffee Bar", answers: 3 },
];

/** The Competitors screen (mockup-ui): the leaderboard with each AI's share, and businesses AI named you don't track. */
export function CompetitorsExample() {
  return (
    <ProductFrame page="Competitors">
      <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
        <p className="text-[14.5px] font-semibold tracking-[-0.01em]">Who AI recommends most</p>
        <span className="text-xs text-text-hint">Scores are give or take 8 points</span>
      </div>
      <LeaderTable rows={ROWS} />
      <div className="border-t border-border">
        <p className="border-b border-border px-[18px] py-3 text-[14.5px] font-semibold tracking-[-0.01em]">Also recommended by AI</p>
        <ul>
          {ALSO.map((n) => (
            <li key={n.name} className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 border-b border-border/60 px-[18px] py-3 text-[13px] last:border-b-0">
              <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {n.name.charAt(0)}
              </span>
              <span className="font-medium">{n.name}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="h-1.5 flex-1 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-xs bg-competitor-2" style={{ width: `${(100 * n.answers) / 36}%` }} />
                </span>
                Named in {n.answers} of 36 answers
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ProductFrame>
  );
}
