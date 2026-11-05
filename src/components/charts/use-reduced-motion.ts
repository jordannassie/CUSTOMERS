"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const q = window.matchMedia(QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

/** True when the viewer asked for less motion. Recharts animates in JS, so its charts read this; CSS motion stops on its own. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);
}
