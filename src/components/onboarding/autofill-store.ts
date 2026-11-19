"use client";

import { useSyncExternalStore } from "react";
import type { AutofillResult } from "@/modules/onboarding/schema";

// Auto-fill values only pre-fill the details form and are never saved unconfirmed (D-73), so they
// travel from the website step to the details step in this tab's session storage.
const key = (businessId: string) => `onboarding-autofill:${businessId}`;

export function saveAutofill(businessId: string, result: AutofillResult) {
  try {
    sessionStorage.setItem(key(businessId), JSON.stringify(result));
  } catch {
    // Storage off (private mode): the details step falls back to the saved site facts.
  }
}

export function clearAutofill(businessId: string) {
  try {
    sessionStorage.removeItem(key(businessId));
  } catch {}
}

function read(businessId: string): string | null {
  try {
    return sessionStorage.getItem(key(businessId));
  } catch {
    return null;
  }
}

const noop = () => () => {};

/** The raw stored result; null on the server and when there is none. */
export function useStoredAutofill(businessId: string): AutofillResult | null {
  const raw = useSyncExternalStore(noop, () => read(businessId), () => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AutofillResult;
  } catch {
    return null;
  }
}
