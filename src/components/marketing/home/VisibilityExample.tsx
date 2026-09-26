import { ExampleTag, MODEL_DOT, type ModelName } from "./example";
import { MiniChart } from "./TrendChart";

const SCORE = 62;
const TREND = [48, 50, 49, 53, 55, 58, 62];
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
          className="grid size-[88px] shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--cd-mid)_calc(var(--v)*1%),var(--cd-muted)_0)]"
        >
          <span className="tabular grid size-[70px] place-items-center rounded-full bg-surface text-2xl font-bold">
            {SCORE}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold">Good confidence</p>
          <p className="text-[13px] text-muted-foreground">
            AI recommended you in about 6 of 10 customer questions this month.
          </p>
        </div>
      </div>

      <div className="border-t border-border px-4 pt-4 sm:px-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium">Last 7 days</span>
          <span className="text-good-text">Up since your last scan</span>
        </div>
        <MiniChart values={TREND} label="Visibility score rising from 48 to 62 over the last 7 days" />
      </div>

      <ul className="flex flex-col gap-2.5 border-t border-border p-4 sm:p-5" aria-label="Score by AI">
        {MODELS.map(({ name, score }) => (
          <li key={name} className="grid grid-cols-[96px_1fr_36px] items-center gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${MODEL_DOT[name]}`} aria-hidden="true" />
              {name}
            </span>
            <span className="h-2 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
              <span className={`block h-full rounded-xs ${MODEL_DOT[name]}`} style={{ width: `${score}%` }} />
            </span>
            <span className="tabular text-right">{score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
