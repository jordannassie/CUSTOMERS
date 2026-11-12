import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompareBox } from "./CompareBox";
import { HeroHighlights } from "./HeroHighlights";
import { HeroPhoto } from "./HeroPhoto";

// mockup-ui with the live site's extras. Wide screens: the headline, apps and checklist beside Mr. Direct (photo top
// level with the headline), then the free check beside Book a demo. Phones: text, check, Book a demo, photo.
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[calc(1120px*var(--px,1))] gap-x-14 gap-y-8 px-4 pt-12 pb-16 [grid-template-areas:'text'_'check'_'demo'_'photo'] sm:px-6 sm:pt-20 sm:pb-22 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:[grid-template-areas:'text_photo'_'check_demo']">
        <div className="flex min-w-0 flex-col gap-6 [grid-area:text]">
          <h1 className="text-[length:calc(32px*var(--px,1))] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl xl:text-[length:calc(56px*var(--px,1))]">
            See if ChatGPT, Claude and Perplexity recommend your business
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
            We ask AI the questions your customers ask, from your city, and show who gets named, why
            competitors win, and what to fix.
          </p>
          <HeroHighlights />
        </div>
        <div className="min-w-0 [grid-area:check]">
          <CompareBox />
        </div>
        <div className="min-w-0 self-start [grid-area:photo]">
          <HeroPhoto />
        </div>
        {/* Beside the free check, the same height: opens the contact form with "Booking a demo call" already chosen. */}
        <div className="flex min-w-0 flex-col justify-center gap-3 rounded-md border border-border bg-surface p-4 [grid-area:demo] sm:p-5">
          <p className="text-[length:calc(15px*var(--px,1))] font-semibold">Rather see it with us?</p>
          <p className="text-muted-foreground text-pretty">A short walk through a real report for a business like yours.</p>
          <Button asChild size="lg" variant="outline" className="w-fit">
            <Link href="/contact?interest=book_demo">
              Book a demo
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
