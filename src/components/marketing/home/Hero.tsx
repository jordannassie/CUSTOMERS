import { CompareBox } from "./CompareBox";
import { HeroPhoto } from "./HeroPhoto";

// mockup-ui: the headline and the free check on the left, Mr. Direct (from the live site) on the right.
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[calc(1120px*var(--px,1))] gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
        <div className="flex min-w-0 flex-col gap-6">
          <h1 className="text-[length:calc(32px*var(--px,1))] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl xl:text-[length:calc(56px*var(--px,1))]">
            See if ChatGPT, Claude and Perplexity recommend your business
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
            We ask AI the questions your customers ask, from your city, and show who gets named, why
            competitors win, and what to fix.
          </p>
          <CompareBox />
        </div>
        <div className="min-w-0">
          <HeroPhoto />
        </div>
      </div>
    </section>
  );
}
