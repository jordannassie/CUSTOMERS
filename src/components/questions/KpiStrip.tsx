import Link from "next/link";
import { KpiStrip as Strip, KpiTile } from "@/components/app/KpiTile";
import { questionKpis } from "@/modules/questions/list";
import { FREQUENCY_WORDS, type QuestionsView } from "@/modules/questions/service";
import { monthlyCredits } from "./credits";

const count = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The smaller words after a number, like "of 25"; they wrap under it in a narrow tile instead of being cut off. */
function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-normal tracking-normal whitespace-normal text-muted-foreground"> {children}</span>;
}

// The four numbers over the active questions (dashboard redesign, Questions 2): how many, how many named you at
// least once and never in the last 30 days, and the credits they use. Joined into one strip (mockup-ui).
export function KpiStrip({ view }: { view: QuestionsView }) {
  const k = questionKpis(view.active, view.paused.length);
  const models = view.models.length;
  const credits = monthlyCredits(k.active, models, view.frequency);

  return (
    <section aria-label="Questions and credits">
      <Strip>
        <KpiTile
          label="Active questions"
          value={
            <span data-testid="active-count">
              {k.active}
              {view.limit !== null && <Unit>of {view.limit}</Unit>}
            </span>
          }
          sub={k.paused > 0 ? `${k.paused} paused, using no credits` : "None paused"}
        />
        <KpiTile
          label="Questions that named you"
          testId="kpi-named"
          tone={k.namedOnce > 0 ? "good" : undefined}
          value={
            <>
              {k.namedOnce}
              <Unit>of {k.active}</Unit>
            </>
          }
          sub="At least once, 30 days"
        />
        <KpiTile
          label="Never named you"
          testId="kpi-never"
          value={k.neverNamed}
          sub={k.checked === 0 ? "Shows after the first scan" : "None in 30 days"}
        />
        <KpiTile
          label="Estimated use"
          testId="credit-estimate"
          value={
            <span aria-live="polite">
              About {count(credits)}
              <Unit>credits a month</Unit>
            </span>
          }
          sub={
            <span
              title={`${plural(k.active, "question", "questions")} × ${plural(models, "AI tool", "AI tools")}, checked ${FREQUENCY_WORDS[view.frequency]}. Each new answer uses 1 credit; answers reused from a recent scan are free.`}
            >
              <span className="capitalize">{FREQUENCY_WORDS[view.frequency]}</span> scans.{" "}
              <Link href="/settings#checks" className="text-primary underline-offset-2 hover:underline">
                Change
              </Link>
            </span>
          }
        />
      </Strip>
    </section>
  );
}
