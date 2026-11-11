"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";

/**
 * A chart's own sideways scroll box (wide charts on a phone). When there is more to the right, a soft fade sits on the
 * right edge and a "Swipe to see more" line shows under it; both go once the end is reached. Nothing shows when the
 * chart fits.
 */
export function ScrollX({ children, className }: { children: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);

  return (
    // min-w-0 on both wrappers: as a flex or grid item the box may shrink below the chart's width and scroll instead.
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="relative min-w-0">
        {/* relative: absolutely placed pieces inside the chart (screen reader labels) stay inside the scroll box. */}
        <div ref={box} className={cn("relative overflow-x-auto", className)}>
          {children}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-card to-transparent transition-opacity duration-200",
            more ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      {more && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground" aria-hidden="true">
          Swipe to see more
          <ArrowRight className="size-3" />
        </p>
      )}
    </div>
  );
}
