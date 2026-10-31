import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { THIN_MARGIN, type ModelMargin, type Verdict } from "@/modules/admin";
import { count, money, percent } from "./format";

const VERDICT: Record<Verdict, { label: string; badge: "good" | "mid" | "low" | "outline"; bar: string }> = {
  profitable: { label: "Profitable", badge: "good", bar: "bg-good" },
  thin: { label: "Thin margin", badge: "mid", bar: "bg-mid" },
  losing: { label: "Losing money", badge: "low", bar: "bg-low" },
  no_data: { label: "No checks yet", badge: "outline", bar: "bg-competitor-3" },
};

const DOT: Record<ModelMargin["model"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};

/** One row per model: how much of each credit's price the AI call eats (D-23). */
export default function MarginCheck({
  models,
  creditPrice,
  otherCost,
}: {
  models: ModelMargin[];
  creditPrice: number | null;
  otherCost: number;
}) {
  return (
    <section aria-labelledby="margin-check" className="rounded-md border border-border bg-surface">
      <header className="border-b border-border px-5 py-4">
        <h2 id="margin-check" className="text-[16px] font-semibold">
          Is each model still profitable?
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {creditPrice === null
            ? "No active plan has a price, so there is no credit price to compare with."
            : `Every check costs the customer 1 credit, worth at least ${money(creditPrice)} on the cheapest plan. The bar shows how much of that the AI call costs us. Under ${percent(THIN_MARGIN)} margin is flagged.`}
        </p>
      </header>
      <ul className="divide-y divide-border">
        {models.map((m) => (
          <ModelRow key={m.model} m={m} creditPrice={creditPrice} />
        ))}
      </ul>
      {otherCost > 0 && (
        <p className="border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
          Other AI work (name extraction, writing questions) cost <span className="tabular font-medium text-foreground">{money(otherCost)}</span>{" "}
          in this period. It is included in the totals above, not in the per-model cost.
        </p>
      )}
    </section>
  );
}

function ModelRow({ m, creditPrice }: { m: ModelMargin; creditPrice: number | null }) {
  const verdict = VERDICT[m.verdict];
  const share = creditPrice && m.costPerCheck !== null ? Math.min(m.costPerCheck / creditPrice, 1) : 0;

  return (
    <li data-model={m.model} data-verdict={m.verdict} className="grid gap-3 px-5 py-4 lg:grid-cols-[160px_1fr_auto] lg:items-center lg:gap-6">
      <div className="flex items-center justify-between gap-3 lg:block">
        <p className="flex items-center gap-2 text-[15px] font-medium">
          <span aria-hidden className={cn("size-2.5 rounded-full", DOT[m.model])} />
          {m.label}
        </p>
        <Badge variant={verdict.badge} className="lg:mt-1.5">
          {verdict.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="img"
          aria-label={`${m.label}: costs ${money(m.costPerCheck) || "nothing yet"} per check against a ${money(creditPrice)} credit`}
          className="h-2 overflow-hidden rounded-xs bg-muted"
        >
          <div className={cn("h-full rounded-xs", verdict.bar)} style={{ width: `${share * 100}%` }} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
          <Fact label="Cost per check" value={money(m.costPerCheck)} />
          <Fact label="Cost per API call" value={money(m.costPerCall)} />
          <Fact label="Checks" value={count(m.checks)} />
          <Fact label="Answered from cache" value={m.checks > 0 ? percent(m.cached / m.checks) : ""} />
        </dl>
      </div>

      <div className="flex items-baseline gap-2 lg:block lg:text-right">
        <p className={cn("tabular text-[24px] font-semibold tracking-[-0.02em]", m.verdict === "losing" && "text-low-text")}>
          {percent(m.margin) || "-"}
        </p>
        <p className="text-[12px] text-muted-foreground">margin</p>
      </div>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value || "-"}</dd>
    </div>
  );
}
