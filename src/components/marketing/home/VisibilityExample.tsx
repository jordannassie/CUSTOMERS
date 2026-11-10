import { ArrowUp } from "lucide-react";
import { ExampleTag, type ModelName } from "./example";
import { MiniChart } from "./TrendChart";

const SCORE = 62;
// One point per weekly scan, as the app draws it (DB-002).
const SCANS = [53, 55, 57, 58, 60, 62];
const MODELS: { name: ModelName; score: number }[] = [
  { name: "ChatGPT", score: 75 },
  { name: "Claude", score: 58 },
  { name: "Perplexity", score: 53 },
];

export function VisibilityExample() {
  return (
    <div className="flex flex-col rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold">Bean House, Orange, CA</p>
        <ExampleTag />
      </div>

      <div className="flex items-center gap-5 p-4 sm:p-5">
        <div
          role="img"
          aria-label={`Visibility score ${SCORE} of 100`}
          style={{ "--v": SCORE } as React.CSSProperties}
          className="grid size-[calc(88px*var(--px,1))] shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--cd-primary)_calc(var(--v)*1%),var(--cd-muted)_0)]"
        >
          <span className="tabular grid size-[calc(70px*var(--px,1))] place-items-center rounded-full bg-surface text-2xl font-bold">
            {SCORE}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold">Good confidence</p>
          <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            AI recommended you in about 6 of 10 customer questions this month.
          </p>
        </div>
      </div>

      <div className="border-t border-border px-4 pt-4 sm:px-5">
        <div className="flex items-baseline justify-between text-[length:calc(13px*var(--px,1))]">
          <span className="font-medium">Score at each scan</span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <ArrowUp className="size-3.5" aria-hidden="true" />
            Up 9 points since Sep 2
          </span>
        </div>
        <MiniChart values={SCANS} label="Visibility score at each weekly scan, rising from 53 to 62" />
      </div>

      <ul className="flex flex-col gap-2.5 border-t border-border p-4 sm:p-5" aria-label="Score by AI">
        {MODELS.map(({ name, score }) => (
          <li key={name} className="grid grid-cols-[calc(96px*var(--px,1))_1fr_calc(36px*var(--px,1))] items-center gap-3 text-sm">
            <span>{name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
            </span>
            <span className="tabular text-right">{score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
