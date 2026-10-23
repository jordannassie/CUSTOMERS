import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Tone = "good" | "mid" | "low";

const toneFill: Record<Tone, string> = {
  good: "[--ring-color:var(--cd-good)]",
  mid: "[--ring-color:var(--cd-mid)]",
  low: "[--ring-color:var(--cd-low)]",
};

function toneFor(score: number): Tone {
  return score >= 70 ? "good" : score >= 40 ? "mid" : "low";
}

function ScoreRing({ score, size = "lg" }: { score: number; size?: "lg" | "sm" }) {
  const outer = size === "lg" ? "size-[92px]" : "size-12";
  const inner = size === "lg" ? "size-[72px] text-2xl" : "size-9 text-xs";
  return (
    <div
      role="img"
      aria-label={`Score ${score} of 100`}
      style={{ "--v": score } as React.CSSProperties}
      className={`grid shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--ring-color)_calc(var(--v)*1%),var(--cd-muted)_0)] ${outer} ${toneFill[toneFor(score)]}`}
    >
      <span className={`tabular grid place-items-center rounded-full bg-surface font-bold ${inner}`}>{score}</span>
    </div>
  );
}

function Bar({ label, value, fill, you }: { label: string; value: number; fill: string; you?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
      <span className={you ? "truncate font-semibold text-primary" : "truncate"}>{label}</span>
      <div className="h-2 overflow-hidden rounded-xs bg-muted">
        <div className={`h-full rounded-xs ${fill}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`tabular text-right ${you ? "font-semibold text-primary" : ""}`}>{value}%</span>
    </div>
  );
}

const QUESTIONS = [
  { q: "Best coffee shop near downtown Austin", checks: "3 of 4", score: 75 },
  { q: "Where to get oat milk latte in Austin", checks: "2 of 4", score: 50 },
  { q: "Quiet cafe to work from in East Austin", checks: "0 of 4", score: 0 },
];

export function DataDisplay() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-right text-xs text-text-hint">Example data</p>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Visibility score</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={62} />
                <div>
                  <Badge variant="good" className="tabular">
                    +8 this week
                  </Badge>
                  <p className="mt-1.5 text-[13px] text-text-hint">Mentioned in 22 of 36 checks</p>
                </div>
              </div>
              <div className="flex gap-3" aria-label="Score colours">
                <ScoreRing score={84} size="sm" />
                <ScoreRing score={62} size="sm" />
                <ScoreRing score={18} size="sm" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="mb-2 flex justify-between text-[13px] text-muted-foreground">
                <span>Credits</span>
                <span className="tabular">620 of 1,200</span>
              </div>
              <Progress value={52} aria-label="Credits used" />
              <p className="mt-2 text-[13px] text-text-hint">Renews in 12 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>You vs competitors</CardTitle>
              <CardDescription>Share of AI answers that mention each business, last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <Bar label="Bean House (you)" value={62} fill="bg-primary" you />
              <Bar label="Daily Grind" value={71} fill="bg-competitor-1" />
              <Bar label="Brew Lab" value={40} fill="bg-competitor-2" />
              <Bar label="Cup & Co" value={22} fill="bg-competitor-3" />
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By AI model</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                <Bar label="ChatGPT" value={75} fill="bg-chatgpt" />
                <Bar label="Claude" value={58} fill="bg-claude" />
                <Bar label="Perplexity" value={50} fill="bg-perplexity" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Get more Google reviews</CardTitle>
                <CardDescription>Daily Grind has 320 reviews at 4.7. You have 12 at 4.2.</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="low">High impact</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Appeared in</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {QUESTIONS.map((row) => (
              <TableRow key={row.q}>
                <TableCell className="font-medium">{row.q}</TableCell>
                <TableCell className="tabular text-muted-foreground">{row.checks} checks</TableCell>
                <TableCell className="text-right">
                  <Badge variant={toneFor(row.score)} className="tabular">
                    {row.score}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
