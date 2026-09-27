import { Section, Eyebrow, H2, Lead } from "../section";
import { estimateMonthlyCredits, formatCount, formatUsd, type PublicPack, type PublicPlan } from "@/modules/billing/format";

// The MVP_SPEC 4.3 example business: 12 questions on all 3 AI assistants.
const QUESTIONS = 12;
const MODELS = 3;
const SCHEDULES = [
  { key: "daily", label: "Every day" },
  { key: "weekly", label: "Every week" },
  { key: "monthly", label: "Every month" },
] as const;

export function Credits({ plans, packs }: { plans: PublicPlan[]; packs: PublicPack[] }) {
  const smallest = plans[0];

  return (
    <Section id="credits">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <Eyebrow>Credits</Eyebrow>
          <H2 className="max-w-[18ch]">1 credit is 1 question asked to 1 AI</H2>
          <Lead>
            Each check asks ChatGPT, Claude or Perplexity one of your customer questions, with web search and your
            location. It costs 1 credit whichever AI answers. If a check fails on our side, you are not charged.
          </Lead>
          <p className="text-[15px] text-muted-foreground">
            Every business on your account adds its monthly credits to one shared pool, so a busy client can use what a
            quiet one does not. Plan credits reset at each renewal.
          </p>
        </div>

        <figure className="self-start rounded-md border border-border bg-surface">
          <figcaption className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold">What a business uses in a month</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {QUESTIONS} questions × {MODELS} AI assistants × scans per month
            </p>
          </figcaption>
          <dl className="divide-y divide-border">
            {SCHEDULES.map(({ key, label }) => (
              <div key={key} className="flex items-baseline justify-between gap-4 px-5 py-4">
                <dt className="text-[15px]">Scan {label.toLowerCase()}</dt>
                <dd className="text-[15px]">
                  <span className="tabular font-semibold">{formatCount(estimateMonthlyCredits(QUESTIONS, MODELS, key))}</span>{" "}
                  <span className="text-muted-foreground">credits</span>
                </dd>
              </div>
            ))}
          </dl>
          {smallest && (
            <p className="border-t border-border px-5 py-4 text-[13px] text-muted-foreground">
              {smallest.name} includes {formatCount(smallest.monthlyCredits)} credits a month per business.
            </p>
          )}
        </figure>
      </div>

      {packs.length > 0 && (
        <div id="top-ups" className="mt-16 grid gap-8 border-t border-border pt-12 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">Need more? Buy a top-up</h3>
            <p className="text-[15px] text-muted-foreground">
              Top-up credits never expire and are used after your plan credits. You can spend them while you have a
              plan or trial. Unused top-ups can be refunded within 14 days.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <li key={pack.id} data-pack-id={pack.id} className="rounded-md border border-border bg-surface p-5">
                <p className="text-[15px] font-medium">
                  <span data-testid="pack-credits" className="tabular">{formatCount(pack.credits)}</span> credits
                </p>
                <p data-testid="pack-price" className="tabular mt-2 text-3xl font-semibold tracking-[-0.03em]">
                  {formatUsd(pack.priceCents)}
                </p>
                <p className="mt-1 text-[13px] text-text-hint">One-time payment</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
