"use client";

import { useEffect, useState } from "react";

interface AccessData {
  isBeta: boolean;
  isAdmin: boolean;
  isExpired: boolean;
  isInTrial: boolean;
}

/**
 * Sidebar access status badge.
 *
 * BETA MODE (current): shows a subtle "Free Beta" pill. No countdown, no
 * urgency, no expiration warnings.
 *
 * FUTURE (when trialEnabled / billingEnabled = true): re-add urgency tiers
 * here once getTrialStatus() returns real expiry data again.
 */
export default function TrialBanner() {
  const [data, setData] = useState<AccessData | null>(null);

  useEffect(() => {
    fetch("/api/user/trial")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  // Don't render until we have data — avoids flash
  if (!data) return null;

  // Admins and beta users see the same subtle badge (or nothing if they prefer silence)
  if (data.isAdmin) return null;

  // Beta mode: show a clean, unobtrusive "Free Beta" pill
  if (data.isBeta) {
    return (
      <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-[#1D4ED8]">Free Beta</span>
      </div>
    );
  }

  // Future: trial countdown / expired states go here.
  // Do NOT show "Trial Ended" or urgency banners while betaFreeAccess is true.
  return null;
}
