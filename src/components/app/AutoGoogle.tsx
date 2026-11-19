"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Compare's Google tab loads its details by itself when the tab is opened (owner, 2026-11-16), instead of waiting for
 * "Show Google details". Google is still asked only for this one view and nothing is kept (D-73). Every tab is rendered
 * at once but hidden, so this waits until its panel is shown before asking: a Compare visit that never opens the
 * Google tab uses no Google lookup. Then the page loads again with ?google=1, which shows the values. "Shown" means the
 * panel has a size, not that it is scrolled into view: on a long page the tab opens below the fold (preview, 2026-11-16).
 */
export function AutoGoogle({ href, when = "shown" }: { href: string; when?: "shown" | "visible" }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let asked = false;
    const go = () => {
      asked = true;
      router.replace(href, { scroll: false });
    };
    // "visible" (the Competitors page, owner 2026-11-17, D-87): asks once the section scrolls near the screen, so a
    // visit that never reaches it uses no Google lookup.
    if (when === "visible") {
      const seen = new IntersectionObserver((entries) => {
        if (asked || !entries.some((e) => e.isIntersecting)) return;
        seen.disconnect();
        go();
      }, { rootMargin: "200px 0px" });
      seen.observe(el);
      return () => seen.disconnect();
    }
    const ask = () => {
      // A hidden panel (display: none) has no boxes; it gets one as soon as its tab is opened.
      if (asked || el.getClientRects().length === 0) return;
      shown.disconnect();
      go();
    };
    const shown = new ResizeObserver(ask);
    shown.observe(el);
    ask();
    return () => shown.disconnect();
  }, [href, router, when]);

  return (
    <div ref={box} role="status" className="flex items-center gap-2.5 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground" data-testid="google-loading">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      Loading your Google listing next to theirs: reviews, rating, opening days and category, live from Google…
    </div>
  );
}
