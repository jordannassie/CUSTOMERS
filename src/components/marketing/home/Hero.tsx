import { CompareBox } from "./CompareBox";
import { DashboardPreview } from "./DashboardPreview";

// mockup-ui: the headline and the free check on the left, the redesigned Overview (example data) on the right.
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
        <div className="flex min-w-0 flex-col gap-6">
          <h1 className="text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl xl:text-[56px]">
            See if ChatGPT, Claude and Perplexity recommend your business
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
            We ask AI the questions your customers ask, from your city, and show who gets named, why
            competitors win, and what to fix.
          </p>
          <CompareBox />
        </div>
        <div className="min-w-0">
          <DashboardPreview variant="hero" />
        </div>
      </div>
    </section>
  );
}
