"use client";

import type { ScanStatus } from "@/modules/jobs";

// Businesses with a scan running that this tab is waiting on. ScanWatcher (in the app shell, so it lives across page
// changes) asks for their status and says when each scan ends; the Run scan button reads that status from here
// instead of asking on its own. Kept in sessionStorage so a reload mid-scan still gets the message.
const KEY = "cd:scan-watch";
const watched = new Set<string>();
const latest = new Map<string, ScanStatus>();
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const ids: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? "[]");
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string" && id.length <= 64) watched.add(id);
  } catch {
    // No storage (private window, blocked site data): the watch still works until the tab reloads.
  }
}

function save() {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify([...watched]));
  } catch {
    // See load().
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** Starts waiting on a business's scan. Any status from an earlier scan is dropped. */
export function watchScan(businessId: string) {
  load();
  if (watched.has(businessId)) return;
  watched.add(businessId);
  latest.delete(businessId);
  save();
  emit();
}

export function unwatchScan(businessId: string) {
  load();
  if (!watched.delete(businessId)) return;
  save();
  emit();
}

/** The watched businesses as one string, so it is a stable snapshot for useSyncExternalStore. */
export function watchedScansKey(): string {
  load();
  return [...watched].join(",");
}

export function publishScanStatus(businessId: string, status: ScanStatus) {
  latest.set(businessId, status);
  emit();
}

export function latestScanStatus(businessId: string): ScanStatus | undefined {
  return latest.get(businessId);
}

export function subscribeScans(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
