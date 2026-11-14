"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = ComponentProps<typeof Link> & { href: string };

/**
 * A navigation link that prefetches only when the user points at it, focuses it or touches it (perf plan #8,
 * 2026-11-13). Next's default prefetched every sidebar route as soon as it showed: 20 to 36 background requests per
 * page view, each a function call on Netlify, for skeletons a click still had to fill in. `prefetch={false}` alone
 * would also stop the hover prefetch, so this starts it by hand.
 */
export function HoverPrefetchLink({ href, onMouseEnter, onFocus, onTouchStart, ...props }: Props) {
  const router = useRouter();
  const warm = () => router.prefetch(href);
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
      {...props}
    />
  );
}
