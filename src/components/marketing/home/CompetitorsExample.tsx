import { ExampleTag } from "./example";

const ROWS = [
  { name: "Daily Grind", score: 81, fill: "bg-competitor-1", verdict: "Ahead of you" },
  { name: "Bean House (you)", score: 62, fill: "bg-primary", you: true },
  { name: "Brew Lab", score: 57, fill: "bg-competitor-2", verdict: "About the same" },
  { name: "Cup & Co", score: 22, fill: "bg-competitor-3", verdict: "Behind you" },
];

const ALSO_NAMED = [
  { name: "Orange Roastery", checks: "5 of 36 checks" },
  { name: "Plaza Coffee Bar", checks: "3 of 36 checks" },
];

export function CompetitorsExample() {
  return (
    <div className="flex flex-col rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold">You vs competitors</p>
          <p className="text-[13px] text-muted-foreground">Share of AI answers naming each business, last 30 days</p>
        </div>
        <ExampleTag />
      </div>

      <ul className="flex flex-col gap-3.5 p-4 sm:p-5">
        {ROWS.map(({ name, score, fill, you, verdict }) => (
          <li key={name} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={you ? "font-semibold text-primary" : "font-medium"}>{name}</span>
              <span className="flex items-baseline gap-3">
                {verdict && <span className="text-[13px] text-text-hint">{verdict}</span>}
                <span className={`tabular w-8 text-right ${you ? "font-semibold text-primary" : ""}`}>{score}%</span>
              </span>
            </div>
            <span className="h-2 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
              <span className={`block h-full rounded-xs ${fill}`} style={{ width: `${score}%` }} />
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-border p-4 sm:p-5">
        <p className="text-sm font-semibold">Also named by AI</p>
        <p className="text-[13px] text-muted-foreground">Businesses you do not track yet</p>
        <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
          {ALSO_NAMED.map(({ name, checks }) => (
            <li key={name} className="flex justify-between gap-3 py-2">
              <span>{name}</span>
              <span className="tabular text-muted-foreground">{checks}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
