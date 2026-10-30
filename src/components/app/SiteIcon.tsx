"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { iconHost } from "@/modules/site-icons/schema";

const BOX = { sm: "size-6 text-[11px]", md: "size-8 text-[13px]" } as const;
const IMG = { sm: 16, md: 20 } as const;

/**
 * A website's icon (its favicon, through /api/icon) in a small square, or its first letter when there is no website,
 * no icon, or the icon fails to load. The letter also shows while the icon loads (a site's own icon can take a few
 * seconds the first time), so the square is never empty. `name` gives the letter: the business or site as the row
 * names it.
 */
export function SiteIcon({ domain, name, size = "md", className }: { domain: string | null; name: string; size?: keyof typeof BOX; className?: string }) {
  const host = domain ? iconHost(domain) : "";
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const img = useRef<HTMLImageElement>(null);
  // An icon that loaded or failed before the page's scripts ran never reported it: check once on mount.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth > 0 ? "loaded" : "failed");
  }, [host]);

  const letter = (name || host || "?").trim().charAt(0);
  const showIcon = host && state !== "failed";
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm font-semibold text-muted-foreground uppercase",
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
          className={cn("object-contain", state === "loaded" ? "static" : "absolute size-0 opacity-0")}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
    </span>
  );
}
