import Link from "next/link";
import { FREQUENCY_WORDS, type QuestionsView } from "@/modules/questions/service";
import { monthlyCredits } from "./credits";

const count = (n: number) => n.toLocaleString("en-US");

export function CreditSummary({ view }: { view: QuestionsView }) {
  const active = view.active.length;
  const models = view.models.length;
  const credits = monthlyCredits(active, models, view.frequency);
  const share = view.limit ? Math.min(100, Math.round((active / view.limit) * 100)) : null;

  return (
    <section aria-label="Questions and credits" className="grid overflow-hidden rounded-md border border-border bg-surface sm:grid-cols-2">
      <div className="flex flex-col gap-2 p-5">
        <p className="text-[13px] text-muted-foreground">Active questions</p>
        <p data-testid="active-count" className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
          {active}
          {view.limit !== null && <span className="text-base font-normal text-muted-foreground"> of {view.limit}</span>}
        </p>
        {share !== null && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-xs bg-border" aria-hidden="true">
            <div className="h-full bg-primary" style={{ width: `${share}%` }} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {view.paused.length > 0 ? `${view.paused.length} paused. ` : ""}Paused questions are not checked and use no credits.
        </p>
      </div>
      <div data-testid="credit-estimate" aria-live="polite" className="flex flex-col gap-2 border-t border-border bg-muted p-5 sm:border-t-0 sm:border-l">
        <p className="text-[13px] text-muted-foreground">Estimated use</p>
        <p className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
          About {count(credits)} <span className="text-base font-normal text-muted-foreground">credits a month</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {active} {active === 1 ? "question" : "questions"} × {models} {models === 1 ? "AI model" : "AI models"}, checked{" "}
          {FREQUENCY_WORDS[view.frequency]}. Each answer uses 1 credit.{" "}
          <Link href="/settings#checks" className="text-primary underline-offset-2 hover:underline">
            Change models or how often
          </Link>
        </p>
      </div>
    </section>
  );
}
