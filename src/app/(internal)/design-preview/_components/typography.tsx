const SCALE = [
  { size: "text-[60px] leading-[1.05] font-bold tracking-[-0.035em]", px: 60, sample: "Is AI recommending you?" },
  { size: "text-5xl leading-[1.05] font-bold tracking-[-0.035em]", px: 48, sample: "Is AI recommending you?" },
  { size: "text-[32px] leading-tight font-semibold tracking-[-0.02em]", px: 32, sample: "Visibility this month" },
  { size: "text-2xl font-semibold tracking-[-0.02em]", px: 24, sample: "Competitors" },
  { size: "text-xl font-semibold tracking-[-0.02em]", px: 20, sample: "Top fix steps" },
  { size: "text-lg", px: 18, sample: "See what ChatGPT, Claude and Perplexity tell your customers." },
  { size: "text-[15px]", px: 15, sample: "Body text. Daily Grind has 320 reviews at 4.7. You have 12 at 4.2." },
  { size: "text-sm", px: 14, sample: "UI default. Buttons, menus, table cells." },
  { size: "text-[13px] text-muted-foreground", px: 13, sample: "Supporting text and labels." },
  { size: "text-xs text-text-hint", px: 12, sample: "Captions and fine print." },
];

export function Typography() {
  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {SCALE.map((row) => (
          <li key={row.px} className="flex items-baseline gap-4 px-4 py-3">
            <span className="tabular w-10 shrink-0 text-xs text-text-hint">{row.px}</span>
            <span className={`min-w-0 truncate ${row.size}`}>{row.sample}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Tabular numbers (scores, credits, money)</p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 text-sm">
            <span className="text-muted-foreground">Proportional</span>
            <span className="text-muted-foreground">Tabular</span>
            {["1,111", "8,888", "$49.00"].map((n) => (
              <div key={n} className="contents">
                <span className="text-right text-lg">{n}</span>
                <span className="tabular text-right text-lg">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Geist Mono, only for codes and IDs</p>
          <p className="mt-3 font-mono text-sm">place_id ChIJN1t_tDeuEmsRUsoyG83frY4</p>
          <p className="mt-1 font-mono text-sm">scan 7f3c2a91</p>
        </div>
      </div>
    </div>
  );
}
