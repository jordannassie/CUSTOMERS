"use client";

import { useSyncExternalStore } from "react";

/** Below Tailwind's md breakpoint (768px): the phone layout. */
export const PHONE_QUERY = "(max-width: 767.98px)";

/**
 * Whether a media query matches, kept in step as the window changes. The server and the first browser render both
 * answer false (desktop), so hydration always matches; the real answer follows on the next render.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const STORED_EVENT = "stored-choice";

/**
 * A small choice kept in this browser (localStorage), such as Board or List. Null until one is saved, on the server
 * and in the first browser render, so hydration always matches. Storage that is blocked just means no saved choice.
 */
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[]): [T | null, (value: T) => void] {
  const value = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(STORED_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(STORED_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const set = (next: T) => {
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Private mode or blocked storage: the choice lasts until the page closes.
    }
    window.dispatchEvent(new Event(STORED_EVENT));
  };
  return [allowed.includes(value as T) ? (value as T) : null, set];
}
