"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Section, H2 } from "../section";
import { BANNERS } from "./media";

const EVERY_MS = 4000;

// The live site's four storefront pictures, one at a time. It rotates by itself (paused on hover, on focus, by the
// button, and for visitors who ask for less motion), and the dots pick a picture directly.
export function BannerRotation() {
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (stopped || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % BANNERS.length), EVERY_MS);
    return () => clearInterval(id);
  }, [stopped, held]);

  const banner = BANNERS[active];

  return (
    <Section aria-labelledby="banner-heading">
      <H2 id="banner-heading" className="mx-auto max-w-[24ch] text-center">
        AI already sends customers to the businesses it can find
      </H2>

      <div
        className="mx-auto mt-10 flex max-w-[896px] flex-col gap-4"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
      >
        <figure className="relative aspect-[1672/941] overflow-hidden rounded-xl border border-border bg-muted">
          {BANNERS.map((b, i) => (
            <Image
              key={b.src}
              src={b.src}
              alt={i === active ? b.alt : ""}
              aria-hidden={i !== active}
              fill
              sizes="(min-width: 896px) 896px, 100vw"
              className={cn("object-cover transition-opacity duration-200", i === active ? "opacity-100" : "opacity-0")}
            />
          ))}
          <figcaption className="absolute bottom-4 left-4 rounded-sm border border-border bg-surface px-3 py-1 text-[length:calc(13px*var(--px,1))] font-medium">
            {banner.industry}
          </figcaption>
        </figure>

        <div className="flex items-center justify-center gap-1">
          {BANNERS.map((b, i) => (
            <button
              key={b.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${b.industry.toLowerCase()} picture`}
              aria-current={i === active}
              className="grid size-11 place-items-center rounded-full"
            >
              <span className={cn("h-2 rounded-full transition-colors", i === active ? "w-6 bg-primary" : "w-2 bg-competitor-2")} />
            </button>
          ))}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-2"
            onClick={() => setStopped((s) => !s)}
            aria-label={stopped ? "Start the slideshow" : "Pause the slideshow"}
          >
            {stopped ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </Section>
  );
}
