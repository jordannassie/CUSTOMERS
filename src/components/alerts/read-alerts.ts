"use client";

import { useMemo, useSyncExternalStore } from "react";

// Which alerts this person has opened, kept in this browser only (alerts have no read state of their own). Each bell
// has its own key; a failed read or write (private window, blocked storage) only brings the New badges back.

const CHANGED = "alerts:read-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function parse(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  try {
    const saved = JSON.parse(raw);
    return new Set(Array.isArray(saved) ? saved.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

/** `read` is null on the server and in the first browser render, so both agree; nothing counts as New until then. */
export function useReadAlerts(storageKey: string, ids: string[]) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => null,
  );
  const read = useMemo(() => parse(raw), [raw]);

  /** Only ids still listed are kept, so the saved list never grows past the alerts there are. */
  function markRead(more: string[]) {
    const next = [...new Set([...(read ?? []), ...more])].filter((id) => ids.includes(id));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Blocked storage: the badges come back on the next visit, nothing else changes.
    }
    window.dispatchEvent(new Event(CHANGED));
  }

  return { read, markRead };
}
