"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import type { Tone } from "@/modules/overview";

const R = 44;
const C = 2 * Math.PI * R;

const STROKE: Record<Tone, string> = { good: "stroke-good", mid: "stroke-mid", low: "stroke-low" };

const SIZE = {
  default: { ring: "size-32 sm:size-36", value: "text-5xl" },
  small: { ring: "size-24", value: "text-3xl" },
} as const;

/**
 * The 30-day visibility score. Fills once on load; shows the final value at once when motion is reduced
 * or `animate` is off (the share page, which is also printed to PDF).
 */
export function ScoreRing({
  score,
  tone,
  animate = true,
  size = "default",
}: {
  score: number;
  tone: Tone;
  animate?: boolean;
  size?: keyof typeof SIZE;
}) {
  const [counted, setCounted] = useState(0);
  const shown = animate ? counted : score;

  useEffect(() => {
    if (!animate) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = duration ? Math.min((now - start) / duration, 1) : 1;
      setCounted(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, animate]);

  return (
    <div className={cn("relative shrink-0", SIZE[size].ring)} role="img" aria-label={`Visibility score ${score} of 100`}>
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
        <span className={cn("leading-none font-semibold tracking-[-0.02em] tabular-nums", SIZE[size].value)} data-testid="score-value">
          {shown}
        </span>
        <span className="mt-1 text-xs text-text-hint">of 100</span>
      </div>
    </div>
  );
}
