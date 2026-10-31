"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

const R = 44;
const C = 2 * Math.PI * R;

/** Fills once on load (DESIGN.md allowed motion); shows the final value at once when motion is reduced. */
export function ScoreRing({ score, you }: { score: number; you: boolean }) {
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
    <div className="relative size-28 shrink-0">
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
          className={cn(you ? "stroke-primary" : "stroke-competitor-1")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[32px] leading-none font-semibold tabular-nums">{shown}</span>
        <span className="text-xs text-text-hint">of 100</span>
      </div>
    </div>
  );
}
