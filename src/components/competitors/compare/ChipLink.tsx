"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { compareHref } from "@/lib/compare-href";

/**
 * A picker chip's link. The tabs switch with pushState (CompareTabs), which Next keeps in useSearchParams, so the
 * chip opens the other competitor on the tab shown now, not the one the page was loaded with.
 */
export function ChipLink({ id, tab, current, className, children }: { id: string; tab: string; current: boolean; className: string; children: ReactNode }) {
  const params = useSearchParams();
  return (
    <Link href={compareHref(id, params.get("tab") ?? tab)} aria-current={current ? "page" : undefined} className={className} data-testid="compare-chip">
      {children}
    </Link>
  );
}
