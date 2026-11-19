"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

/**
 * A small spinner inside a tab or link while the page it opens loads, so the click shows at once (BUG-307, BUG-326).
 * Must sit inside a next/link Link; it renders nothing otherwise.
 */
export function LinkPendingSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-hidden="true" className={cn("size-3 shrink-0 animate-spin text-muted-foreground", className)} /> : null;
}
