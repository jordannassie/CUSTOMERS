"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, XCircle } from "lucide-react";

interface TrialData {
  isInTrial: boolean;
  isExpired: boolean;
  daysLeft: number;
  trialEndsAt: string | null;
  isAdmin: boolean;
}

/**
 * Trial status banner shown in the DashboardShell sidebar.
 *
 * Urgency tiers:
 *   7+ days  → subtle grey (barely visible)
 *   3-6 days → amber warning
 *   1-2 days → red alert
 *   0 days   → red alert "last day"
 *   expired  → sidebar pill only (full expired overlay handled by pages)
 */
export default function TrialBanner() {
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/trial")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setTrial(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !trial) return null;

  // Admins and paid subscribers don't see trial UI
  if (trial.isAdmin) return null;
  if (!trial.isInTrial && !trial.isExpired) return null;

  // Determine urgency
  const urgent = trial.daysLeft <= 2 && !trial.isExpired;
  const warning = trial.daysLeft >= 3 && trial.daysLeft <= 6;

  if (trial.isExpired) {
    return (
      <div className="mx-3 mb-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3">
        <div className="flex items-center gap-2 mb-1">
          <XCircle size={13} className="text-[#DC2626] shrink-0" />
          <span className="text-[11px] font-semibold text-[#DC2626]">Trial Ended</span>
        </div>
        <p className="text-[10px] text-[#B91C1C] leading-relaxed">
          Your 14-day free trial has ended. Your data is safe.
        </p>
        <p className="text-[10px] text-[#B91C1C] mt-1 font-medium">
          Upgrade — Coming Soon
        </p>
      </div>
    );
  }

  if (urgent) {
    return (
      <div className="mx-3 mb-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={13} className="text-[#DC2626] shrink-0" />
          <span className="text-[11px] font-semibold text-[#DC2626]">
            {trial.daysLeft === 0 ? "Trial ends today!" : `${trial.daysLeft} day${trial.daysLeft !== 1 ? "s" : ""} left`}
          </span>
        </div>
        <p className="text-[10px] text-[#B91C1C]">Free Trial — full access expiring soon.</p>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="mx-3 mb-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] p-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={12} className="text-[#D97706] shrink-0" />
          <span className="text-[11px] font-semibold text-[#D97706]">
            {trial.daysLeft} days left in trial
          </span>
        </div>
        <p className="text-[10px] text-[#92400E]">Free Trial · Full access</p>
      </div>
    );
  }

  // Subtle (7+ days)
  return (
    <div className="mx-3 mb-3 rounded-lg bg-[#F5F5F2] border border-[#E5E5E1] px-3 py-2">
      <div className="flex items-center gap-2">
        <Clock size={11} className="text-[#A3A3A0] shrink-0" />
        <span className="text-[10px] text-[#777773]">
          Free Trial — {trial.daysLeft} days left
        </span>
      </div>
    </div>
  );
}
