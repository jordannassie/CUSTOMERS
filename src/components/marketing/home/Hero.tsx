import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompareBox } from "./CompareBox";
import { AppChips, HeroChecklist } from "./HeroHighlights";
import { HeroPhoto } from "./HeroPhoto";

// mockup-ui with the live site's extras. Wide screens: the headline and the free check on the left, so the check is
// seen without scrolling; Mr. Direct (top level with the headline), the app chips and Book a demo on the right; then
// the four "what you get" points in one line across the page. Phones: text, check, points, apps, Book a demo, photo
// (the columns dissolve and `order` sets it).
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto flex max-w-[calc(1120px*var(--px,1))] flex-col gap-8 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-x-14 lg:gap-y-10">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
          <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-none">
            <h1 className="text-[length:calc(32px*var(--px,1))] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl xl:text-[length:calc(56px*var(--px,1))]">
              See if ChatGPT, Claude and Perplexity recommend your business
            </h1>
            <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
              We ask AI the questions your customers ask, from your city, and show who gets named, why
              competitors win, and what to fix.
            </p>
          </div>
          <div className="order-2 min-w-0 lg:order-none">
            <CompareBox />
          </div>
        </div>
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <div className="order-6 min-w-0 lg:order-none">
            <HeroPhoto />
          </div>
          <div className="order-4 min-w-0 lg:order-none">
            <AppChips />
          </div>
          {/* Opens the contact form with "Booking a demo call" already chosen. */}
          <Button asChild size="lg" variant="outline" className="order-5 w-full lg:order-none">
            <Link href="/contact?interest=book_demo">
              Book a demo
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="order-3 min-w-0 lg:order-none lg:col-span-2">
          <HeroChecklist />
        </div>
      </div>
    </section>
  );
}
