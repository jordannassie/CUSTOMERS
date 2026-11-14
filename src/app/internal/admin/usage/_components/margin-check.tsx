import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { THIN_MARGIN, type ModelMargin, type Verdict } from "@/modules/admin";
import { count, money, percent, unitPrice } from "./format";

// The app's pill colours (src/components/app/pills.ts): grey when fine, blue when thin, red only when losing money.
const VERDICT: Record<Verdict, { label: string; badge: "mid" | "tint" | "secondary"; bar: string }> = {
  profitable: { label: "Profitable", badge: "secondary", bar: "bg-primary" },
  thin: { label: "Thin margin", badge: "tint", bar: "bg-primary" },
  losing: { label: "Losing money", badge: "mid", bar: "bg-mid" },
  no_data: { label: "No checks yet", badge: "secondary", bar: "bg-competitor-3" },
};

const DOT: Record<ModelMargin["model"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};

/** One row per model: how much of each credit's price the AI call eats (D-23). Cache hits charge no credit, so cost is per credit charged. */
export default function MarginCheck({
  models,
  creditPrice,
  creditBasis = null,
  otherCost,
}: {
  models: ModelMargin[];
  creditPrice: number | null;
  /** Where that price comes from, like "the 2,000 credits top-up". */
  creditBasis?: string | null;
  otherCost: number;
}) {
  return (
    <section aria-labelledby="margin-check" className="rounded-md border border-border bg-surface">
      <header className="border-b border-border px-5 py-4">
        <h2 id="margin-check" className="text-[length:calc(16px*var(--px,1))] font-semibold">
          Is each model still profitable?
        </h2>
        <p className="mt-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
          {creditPrice === null
            ? "No active plan has a price, so there is no credit price to compare with."
            : `Each check with a new answer costs the customer 1 credit. Answers reused from the cache are free. A credit is worth at least ${unitPrice(creditPrice)}${creditBasis ? `, the price on ${creditBasis}` : ""}, the cheapest way to buy credits. The bar shows how much of that the AI costs us. A margin under ${percent(THIN_MARGIN)} is flagged.`}
        </p>
      </header>
      <ul className="divide-y divide-border">
        {models.map((m) => (
          <ModelRow key={m.model} m={m} creditPrice={creditPrice} />
        ))}
      </ul>
      {otherCost > 0 && (
        <p className="border-t border-border px-5 py-3 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
          Other AI work (explanations of why competitors win, reading business names, auto-fill and writing questions) cost{" "}
          <span className="tabular font-medium text-foreground">{money(otherCost)}</span> in this period. It is in the totals above, not in
          the cost per credit.
        </p>
      )}
    </section>
  );
}

function ModelRow({ m, creditPrice }: { m: ModelMargin; creditPrice: number | null }) {
  const verdict = VERDICT[m.verdict];
  const share = creditPrice && m.costPerCredit !== null ? Math.min(m.costPerCredit / creditPrice, 1) : 0;

  return (
    <li data-model={m.model} data-verdict={m.verdict} className="grid gap-3 px-5 py-4 lg:grid-cols-[calc(160px*var(--px,1))_1fr_auto] lg:items-center lg:gap-6">
      <div className="flex items-center justify-between gap-3 lg:block">
        <p className="flex items-center gap-2 text-[length:calc(15px*var(--px,1))] font-medium">
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
          aria-label={`${m.label}: costs ${unitPrice(m.costPerCredit) || "nothing yet"} per credit against a ${unitPrice(creditPrice)} credit`}
          className="h-2 overflow-hidden rounded-xs bg-muted"
        >
          <div className={cn("h-full rounded-xs", verdict.bar)} style={{ width: `${share * 100}%` }} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[length:calc(13px*var(--px,1))] sm:grid-cols-4">
          <Fact label="Cost per credit" value={unitPrice(m.costPerCredit)} />
          <Fact label="Checks" value={count(m.checks)} />
          <Fact label="Checks charged" value={count(m.checks - m.cached)} />
          <Fact label="From cache, free" value={m.checks > 0 ? percent(m.cached / m.checks) : ""} />
        </dl>
      </div>

      <div className="flex items-baseline gap-2 lg:block lg:text-right">
        <p className={cn("tabular text-[length:calc(24px*var(--px,1))] font-semibold tracking-[-0.02em]", m.verdict === "losing" && "text-mid-text")}>
          {percent(m.margin) || "-"}
        </p>
        <p className="text-[length:calc(12px*var(--px,1))] text-muted-foreground">margin</p>
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
