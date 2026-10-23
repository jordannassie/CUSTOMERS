"use client";

import { useLinkStatus } from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "cn";

// Setup pages render in full before they show (instant = false) and can't be prefetched, so a click on a link to one
// changed nothing on screen for up to a second (2026-10-23). These icons turn into a spinner while it loads.

/** The Back arrow, a spinner while the step before loads. Must sit inside the Link. */
export function BackIcon() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-hidden className="animate-spin" /> : <ArrowLeft aria-hidden />;
}

/** A done step's tick in the setup sidebar, a spinner while that step loads. Must sit inside the Link. */
export function DoneStepIcon({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-hidden className={cn("animate-spin", className)} /> : <Check aria-hidden className={className} />;
}
