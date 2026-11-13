"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";

/**
 * A box that scrolls sideways, and says so (audit 2026-11-12: on a phone, table columns and buttons hid past the edge
 * with no sign they were there). Only when the content is wider than the box: a fade on the right edge until the end
 * is reached, and a one-line hint under it. Wider screens where everything fits see nothing extra.
 */
export function ScrollX({ className, children, ...props }: React.ComponentProps<"div">) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState({ overflow: false, atEnd: true });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const overflow = el.scrollWidth - el.clientWidth > 4;
      const atEnd = el.scrollWidth - el.clientWidth - el.scrollLeft <= 4;
      setState((s) => (s.overflow === overflow && s.atEnd === atEnd ? s : { overflow, atEnd }));
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);

  return (
    <div className="relative w-full">
      <div ref={ref} className={cn("relative w-full overflow-x-auto", className)} {...props}>
        {children}
      </div>
      {state.overflow && !state.atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" aria-hidden="true" />
      )}
      {state.overflow && (
        <p className="flex items-center gap-1 px-4 py-1.5 text-xs text-muted-foreground" aria-hidden="true" data-testid="scroll-hint">
          Scroll sideways to see more
          <ChevronRight className="size-3.5" />
        </p>
      )}
    </div>
  );
}
