import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaderboard } from "@/components/competitors/Leaderboard";
import type { LeaderRow } from "@/modules/competitors";
import { ProductFrame } from "./ProductFrame";

const LEADERBOARD: LeaderRow[] = [
  { name: "Daily Grind", isYou: false, score: 81, standing: "behind", collecting: false, shade: 1 },
  { name: "Bean House", isYou: true, score: 62, standing: null, collecting: false, shade: null },
  { name: "Brew Lab", isYou: false, score: 57, standing: "about_same", collecting: false, shade: 2 },
  { name: "Cup & Co", isYou: false, score: 22, standing: "ahead", collecting: false, shade: 3 },
];

const ANSWERS = 36;
const ALSO_NAMED = [
  { name: "Orange Roastery", answers: 5 },
  { name: "Plaza Coffee Bar", answers: 3 },
];

/** The Competitors screen (B-50): the real leaderboard, with the margin band that decides each verdict. */
export function CompetitorsExample() {
  return (
    <ProductFrame page="Competitors">
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who AI recommends most</CardTitle>
            <CardDescription>Share of customer questions where each business was recommended.</CardDescription>
          </CardHeader>
          <CardContent>
            <Leaderboard view={{ leaderboard: LEADERBOARD, margin: 8 }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Also recommended by AI</CardTitle>
            <CardDescription>Businesses AI named that you do not track yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {ALSO_NAMED.map((n) => (
                <li key={n.name} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium">{n.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Named in {n.answers} of {ANSWERS} answers
                  </span>
                  <span className="h-1 overflow-hidden rounded-xs bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-xs bg-competitor-2"
                      style={{ width: `${(100 * n.answers) / ALSO_NAMED[0].answers}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ProductFrame>
  );
}
