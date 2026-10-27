import Link from "next/link";
import { questionKpis } from "@/modules/questions/list";
import {
  FREQUENCY_WORDS,
  type QuestionsView,
} from "@/modules/questions/service";
import { monthlyCredits } from "./credits";

const count = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

type TileProps = {
  label: string;
  children: React.ReactNode;
  note: React.ReactNode;
  testId?: string;
  live?: boolean;
};

function Tile({ label, children, note, testId, live }: TileProps) {
  return (
    <div
      className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-surface p-5"
      data-testid={testId}
      aria-live={live ? "polite" : undefined}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
        {children}
      </div>
      <div className="text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

// The four numbers over the active questions (dashboard redesign, Questions 2): how many, how many named you at
// least once and never in the last 30 days, and the credits they use.
export function KpiStrip({ view }: { view: QuestionsView }) {
  const k = questionKpis(view.active, view.paused.length);
  const models = view.models.length;
  const credits = monthlyCredits(k.active, models, view.frequency);
  const share = view.limit
    ? Math.min(100, Math.round((k.active / view.limit) * 100))
    : null;

  return (
    <section
      aria-label="Questions and credits"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Tile
        label="Active questions"
        note={
          <div className="flex flex-col gap-2">
            {share !== null && (
              <div
                className="h-1.5 overflow-hidden rounded-xs bg-border"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${share}%` }}
                />
              </div>
            )}
            <span>
              {k.paused > 0
                ? `${k.paused} paused, not checked and no credits used.`
                : "Paused questions are not checked and use no credits."}
            </span>
          </div>
        }
      >
        <span data-testid="active-count">
          {k.active}
          {view.limit !== null && (
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              of {view.limit}
            </span>
          )}
        </span>
      </Tile>

      <Tile
        label="Questions that named you"
        note="By at least 1 AI tool in the last 30 days."
        testId="kpi-named"
      >
        {k.namedOnce}
        <span className="text-base font-normal text-muted-foreground">
          {" "}
          of {k.active}
        </span>
      </Tile>

      <Tile
        label="Never named you"
        testId="kpi-never"
        note={
          k.checked === 0
            ? "Shows after the first scan."
            : "Checked, but no AI tool named you in 30 days."
        }
      >
        {k.neverNamed}
      </Tile>

      <Tile
        label="Estimated use"
        testId="credit-estimate"
        live
        note={
          <>
            {plural(k.active, "question", "questions")} ×{" "}
            {plural(models, "AI tool", "AI tools")}, checked{" "}
            {FREQUENCY_WORDS[view.frequency]}. Each answer uses 1 credit.{" "}
            <Link
              href="/settings#checks"
              className="text-primary underline-offset-2 hover:underline"
            >
              Change
            </Link>
          </>
        }
      >
        About {count(credits)}{" "}
        <span className="text-base font-normal text-muted-foreground">
          credits a month
        </span>
      </Tile>
    </section>
  );
}
