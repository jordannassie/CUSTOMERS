import { cn } from "cn";
import { CTA } from "@/components/marketing/section";
import { TRIAL_HREF, TRIAL_LABEL } from "@/components/marketing/nav";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReadinessCheckResult, SiteResult } from "@/modules/readiness-check";
import { ScoreRing } from "./ScoreRing";
import { ChecksTable, FindingsList } from "./Details";

function band(score: number) {
  if (score >= 70) return { label: "Easy for AI to read", className: "bg-good-bg text-good-text" };
  if (score >= 40) return { label: "Some gaps", className: "bg-mid-bg text-mid-text" };
  return { label: "Hard for AI to read", className: "bg-low-bg text-low-text" };
}

function headline({ mine, them }: ReadinessCheckResult): string {
  if (!mine.reached) return `We could not open ${mine.domain}. Check the address and try again.`;
  if (!them.reached) return `We could not open ${them.domain}, so only your site was checked.`;
  const gap = mine.score - them.score;
  if (gap > 3) return `Your website is easier for AI to understand than ${them.domain}`;
  if (gap < -3) return `${them.domain} is easier for AI to understand than your website`;
  return "Both websites are about as easy for AI to understand";
}

function SiteScore({ site, you }: { site: SiteResult; you: boolean }) {
  const b = band(site.score);
  return (
    <div className="flex items-center gap-5 p-5 sm:p-6">
      {site.reached ? (
        <ScoreRing score={site.score} you={you} />
      ) : (
        <div className="flex size-28 shrink-0 items-center justify-center rounded-full border-7 border-muted text-center text-[13px] text-text-hint">
          Not reached
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[13px] text-muted-foreground">{you ? "Your website" : "Competitor"}</p>
        <p className="truncate text-lg font-semibold">{site.domain}</p>
        {site.reached && <span className={cn("w-fit rounded-sm px-2 py-0.5 text-[13px] font-medium", b.className)}>{b.label}</span>}
      </div>
    </div>
  );
}

export function ResultView({ result }: { result: ReadinessCheckResult }) {
  const anyReached = result.mine.reached || result.them.reached;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="result-heading" className="rounded-md border border-border bg-surface">
        <div className="flex flex-col gap-1 border-b border-border p-5 sm:p-6">
          <h2 id="result-heading" className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance">
            {headline(result)}
          </h2>
          <p className="text-[14px] text-muted-foreground">
            Readiness score out of 100, from the checks below. It measures the website, not what AI tools say.
          </p>
        </div>
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <SiteScore site={result.mine} you />
          <SiteScore site={result.them} you={false} />
        </div>
      </section>

      {result.findings.length > 0 && <FindingsList findings={result.findings} />}
      {anyReached && <ChecksTable result={result} />}

      <CTA
        title="See if ChatGPT, Claude and Perplexity actually recommend you"
        description="This check reads websites only. The 7-day trial asks the AI apps the questions your customers ask, from your city, and shows who gets named and what to fix. Card required."
        primary={{ label: TRIAL_LABEL, href: TRIAL_HREF }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-label="Checking both websites">
      <div className="rounded-md border border-border bg-surface">
        <div className="flex flex-col gap-2 border-b border-border p-5 sm:p-6">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-5 p-5 sm:p-6">
              <Skeleton className="size-28 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
