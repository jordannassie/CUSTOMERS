/**
 * Trial system utilities — server-authoritative.
 *
 * Trial state is read from profiles.trial_ends_at which is set by the DB
 * trigger on profile creation. The browser never calculates trial validity —
 * it always reads from the server.
 *
 * Trial limits (usage controls for the free trial period):
 *   These are deliberately generous enough to demo the full product
 *   while preventing runaway API costs.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

// ─── Trial limits ─────────────────────────────────────────────────────────────

export const TRIAL_LIMITS = {
  /** Max businesses per account during trial */
  maxBusinesses: 2,
  /** Max competitors per business */
  maxCompetitors: 6,
  /** Max tracked prompts per business */
  maxPrompts: 20,
  /** Max manual visibility scans per business during the trial */
  maxManualScans: 5,
  /** SEO snapshot refresh interval (hours) — use cached data within this window */
  seoRefreshCooldownHours: 24,
} as const;

// ─── Trial status ─────────────────────────────────────────────────────────────

export interface TrialStatus {
  /** User is within their 14-day trial window */
  isInTrial: boolean;
  /** Trial has ended (and no paid subscription is active) */
  isExpired: boolean;
  /** Whole days remaining (0 on last day) */
  daysLeft: number;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  /** true for admin accounts that bypass trial (future use) */
  isAdmin: boolean;
}

/**
 * Loads trial status from the database for the currently authenticated user.
 * Returns { isInTrial: true, isExpired: false, daysLeft: 999, isAdmin: false }
 * if trial dates are not yet set (e.g. profile was created before migration 010),
 * to avoid accidentally locking out existing accounts.
 */
export async function getTrialStatus(): Promise<TrialStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isInTrial: false,
      isExpired: true,
      daysLeft: 0,
      trialStartsAt: null,
      trialEndsAt: null,
      isAdmin: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_starts_at, trial_ends_at, account_type")
    .eq("id", user.id)
    .maybeSingle();

  // Admin bypass
  if (profile?.account_type === "admin") {
    return {
      isInTrial: true,
      isExpired: false,
      daysLeft: 999,
      trialStartsAt: null,
      trialEndsAt: null,
      isAdmin: true,
    };
  }

  // Check if user has an active paid subscription on any business
  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (activeSub) {
    // Paid subscriber — never expire
    return {
      isInTrial: false,
      isExpired: false,
      daysLeft: 999,
      trialStartsAt: profile?.trial_starts_at ? new Date(profile.trial_starts_at as string) : null,
      trialEndsAt: profile?.trial_ends_at ? new Date(profile.trial_ends_at as string) : null,
      isAdmin: false,
    };
  }

  // No trial dates set — treat as in trial (safety for pre-migration accounts)
  if (!profile?.trial_ends_at) {
    return {
      isInTrial: true,
      isExpired: false,
      daysLeft: 14,
      trialStartsAt: null,
      trialEndsAt: null,
      isAdmin: false,
    };
  }

  const trialEndsAt = new Date(profile.trial_ends_at as string);
  const trialStartsAt = profile.trial_starts_at ? new Date(profile.trial_starts_at as string) : null;
  const now = new Date();
  const msLeft = trialEndsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
  const isInTrial = msLeft > 0;

  return {
    isInTrial,
    isExpired: !isInTrial,
    daysLeft,
    trialStartsAt,
    trialEndsAt,
    isAdmin: false,
  };
}
