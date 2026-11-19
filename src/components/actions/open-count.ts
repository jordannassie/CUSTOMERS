"use client";

import { useSyncExternalStore } from "react";

// The Actions header's "N open." count, kept by the board: a move shows at once and is saved without the page being
// rendered again (opportunities/actions.ts), so the header reads the board's own count instead of the server's.
const counts = new Map<string, number>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Set by the board whenever its list changes; null when it unmounts, so the next page starts from the server's. */
export function publishOpenCount(businessId: string, count: number | null) {
  if (count === null ? !counts.delete(businessId) : counts.get(businessId) === count) return;
  if (count !== null) counts.set(businessId, count);
  emit();
}

export function useOpenCount(businessId: string, initial: number): number {
  return useSyncExternalStore(
    subscribe,
    () => counts.get(businessId) ?? initial,
    () => initial,
  );
}
