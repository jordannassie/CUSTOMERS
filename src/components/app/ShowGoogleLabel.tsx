"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/** The "Show Google details" link's label: says it is working while the page asks Google (a few seconds). */
export function ShowGoogleLabel() {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      <span aria-live="polite">{pending ? "Loading Google details…" : "Show Google details"}</span>
    </>
  );
}
