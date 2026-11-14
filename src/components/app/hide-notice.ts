"use client";

import { useCallback, useSyncExternalStore } from "react";

// Warnings can be hidden for a while and come back on their own (2026-11-10, the user's call). The time is kept in
// this browser only: a hidden warning shows again after HIDE_FOR_MS, on another device, or when its words change.
export const HIDE_FOR_MS = 15 * 60 * 1000;
export const HIDE_LABEL = "Hide for 15 minutes";

const PREFIX = "cd-hidden:";
// Used when the browser blocks storage (a private window), so the × still works until the page reloads.
const memory = new Map<string, number>();
const listeners = new Set<() => void>();

/** A short, stable key for a warning's words, so a different message is never hidden by an older click. */
export function noticeKey(kind: string, text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return `${kind}:${h.toString(36)}`;
}

function hiddenAt(key: string): number {
  try {
    const saved = Number(window.localStorage.getItem(PREFIX + key));
    if (saved > 0) return saved;
  } catch {
    // Storage blocked: fall back to this page's memory.
  }
  return memory.get(key) ?? 0;
}

const isHidden = (key: string) => Date.now() - hiddenAt(key) < HIDE_FOR_MS;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Checked every minute, so a warning comes back on its own while the page stays open.
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.clearInterval(timer);
    window.removeEventListener("storage", onChange);
  };
}

function hide(key: string) {
  const now = Date.now();
  memory.set(key, now);
  try {
    window.localStorage.setItem(PREFIX + key, String(now));
  } catch {
    // Kept in memory only.
  }
  for (const notify of listeners) notify();
}

/**
 * Which of these warnings are hidden right now, and a function to hide one. The server and the first render show
 * every warning (no storage there); a hidden one disappears straight after.
 */
export function useHiddenNotices(keys: string[]): { hidden: Set<string>; hide: (key: string) => void } {
  const joined = keys.join("\n");
  const snapshot = useSyncExternalStore(
    subscribe,
    () => joined.split("\n").filter((k) => k && isHidden(k)).join("\n"),
    () => "",
  );
  return { hidden: new Set(snapshot ? snapshot.split("\n") : []), hide: useCallback((key: string) => hide(key), []) };
}
