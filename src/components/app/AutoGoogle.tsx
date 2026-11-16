"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Compare's Google tab loads its details by itself when the tab is opened (owner, 2026-11-16), instead of waiting for
 * "Show Google details". Google is still asked only for this one view and nothing is kept (D-73). Every tab is rendered
 * at once but hidden, so this waits until its panel is on screen before asking: a Compare visit that never opens the
 * Google tab uses no Google lookup. Then the page loads again with ?google=1, which shows the values.
 */
export function AutoGoogle({ href }: { href: string }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let asked = false;
    const seen = new IntersectionObserver((entries) => {
      if (asked || !entries.some((e) => e.isIntersecting)) return;
      asked = true;
      seen.disconnect();
      router.replace(href, { scroll: false });
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, [href, router]);

  return (
    <div ref={box} role="status" className="flex items-center gap-2.5 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground" data-testid="google-loading">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      Loading your Google listing next to theirs: reviews, rating, opening days and category, live from Google…
    </div>
  );
}
