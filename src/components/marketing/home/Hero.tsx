import { AnswerExample } from "./AnswerExample";
import { CompareBox } from "./CompareBox";

export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          <h1 className="text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
            See if ChatGPT, Claude and Perplexity recommend your business
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
            We ask AI the questions your customers ask, from your city, and show who gets named, why
            competitors win, and what to fix.
          </p>
          <CompareBox />
        </div>
        <AnswerExample />
      </div>
    </section>
  );
}
