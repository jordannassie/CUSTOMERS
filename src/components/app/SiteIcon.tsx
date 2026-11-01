"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { iconHost } from "@/modules/site-icons/schema";

const BOX = { sm: "size-6 text-[11px]", md: "size-8 text-[13px]" } as const;
// The icon nearly fills its circle (mockup-ui: round icons, the owner's pick), clipped round so square logos sit well.
const IMG = { sm: 20, md: 26 } as const;

/**
 * A website's icon (its favicon, through /api/icon) in a small square, or its first letter when there is no website,
 * no icon, or the icon fails to load. The letter also shows while the icon loads (a site's own icon can take a few
 * seconds the first time), so the square is never empty. `name` gives the letter: the business or site as the row
 * names it.
 */
export function SiteIcon({ domain, name, size = "md", className }: { domain: string | null; name: string; size?: keyof typeof BOX; className?: string }) {
  const host = domain ? iconHost(domain) : "";
  // Kept per host, so a row that switches to another website tries its icon instead of keeping the last one's result.
  const [seen, setSeen] = useState<{ host: string; state: "loading" | "loaded" | "failed" }>({ host, state: "loading" });
  const state = seen.host === host ? seen.state : "loading";
  const setState = (next: "loaded" | "failed") => setSeen({ host, state: next });
  const img = useRef<HTMLImageElement>(null);
  // An icon that loaded or failed before the page's scripts ran never reported it: check once on mount.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setSeen({ host, state: el.naturalWidth > 0 ? "loaded" : "failed" });
  }, [host]);

  const letter = (name || host || "?").trim().charAt(0);
  const showIcon = host && state !== "failed";
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-muted-foreground uppercase",
        showIcon && state === "loaded" ? "border border-border bg-surface" : "bg-muted",
        BOX[size],
        className,
      )}
      aria-hidden="true"
      data-testid={showIcon && state === "loaded" ? "site-icon" : "site-initial"}
    >
      {!(showIcon && state === "loaded") && letter}
      {showIcon && (
        // eslint-disable-next-line @next/next/no-img-element -- icons of any website, through our own cached route
        <img
          ref={img}
          src={`/api/icon?domain=${encodeURIComponent(host)}`}
          alt=""
          width={IMG[size]}
          height={IMG[size]}
          decoding="async"
          className={cn("rounded-full object-cover", state === "loaded" ? "static" : "absolute size-0 opacity-0")}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
    </span>
  );
}
