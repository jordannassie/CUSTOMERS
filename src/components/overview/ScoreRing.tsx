"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import type { Tone } from "@/modules/overview";

const R = 44;
const C = 2 * Math.PI * R;

const STROKE: Record<Tone, string> = { good: "stroke-good", mid: "stroke-mid", low: "stroke-low" };

/** The 30-day visibility score. Fills once on load; shows the final value at once when motion is reduced. */
export function ScoreRing({ score, tone }: { score: number; tone: Tone }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = duration ? Math.min((now - start) / duration, 1) : 1;
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative size-32 shrink-0 sm:size-36" role="img" aria-label={`Visibility score ${score} of 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (shown / 100) * C}
          className={cn(STROKE[tone])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-5xl leading-none font-semibold tracking-[-0.02em] tabular-nums" data-testid="score-value">
          {shown}
        </span>
        <span className="mt-1 text-xs text-text-hint">of 100</span>
      </div>
    </div>
  );
}
