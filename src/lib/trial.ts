/**
 * Trial system utilities — server-authoritative.
 *
 * FAIL-OPEN DESIGN: Any error or missing data returns "in trial" (safe state).
 * isExpired=true is only ever returned when there is explicit, positive evidence
 * that the trial period has definitively ended. When in doubt, give access.
 *
 * Admin bypass (multiple layers, checked in order):
 *   1. ADMIN_USER_IDS env var (comma-separated Supabase UUIDs) — fastest, no DB
 *   2. ADMIN_EMAILS env var (comma-separated email addresses) — no DB
 *   3. profiles.account_type = 'admin' in the database
 *
 * Trial limits (usage controls — keep abuse in check without killing UX):
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

// ─── Trial limits ─────────────────────────────────────────────────────────────

export const TRIAL_LIMITS = {
  maxBusinesses: 2,
  maxCompetitors: 6,
  maxPrompts: 20,
  maxManualScans: 5,
  seoRefreshCooldownHours: 24,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safe state: user is in trial and can use all features. Used on any uncertainty. */
const SAFE_IN_TRIAL = Object.freeze({
  isInTrial: true,
  isExpired: false,
  daysLeft: 30,
  trialStartsAt: null,
  trialEndsAt: null,
  isAdmin: false,
});

function parseEnvList(envVar: string | undefined): string[] {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Returns true if the user ID or email matches any configured admin list. */
function isAdminByEnv(userId: string, userEmail: string | null | undefined): boolean {
  const adminIds = parseEnvList(process.env.ADMIN_USER_IDS);
  if (adminIds.length && adminIds.includes(userId.toLowerCase())) return true;
  if (userEmail) {
    const adminEmails = parseEnvList(process.env.ADMIN_EMAILS);
    if (adminEmails.length && adminEmails.includes(userEmail.toLowerCase())) return true;
  }
  return false;
}

// ─── Trial status ─────────────────────────────────────────────────────────────

export interface TrialStatus {
  isInTrial: boolean;
  isExpired: boolean;
  daysLeft: number;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  isAdmin: boolean;
}

/**
 * Returns the server-authoritative trial status for the current user.
 *
 * Never throws. Returns SAFE_IN_TRIAL on any error or missing data.
 * Only returns isExpired=true when trial_ends_at is explicitly in the past.
 */
export async function getTrialStatus(): Promise<TrialStatus> {
  try {
    const supabase = await createClient();

    let user: { id: string; email?: string | null } | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    } catch {
      // Auth lookup failed — cannot determine trial state
      return { ...SAFE_IN_TRIAL };
    }

    if (!user) {
      // Not authenticated — caller should redirect, not block on trial logic
      return {
        isInTrial: false,
        isExpired: false,
        daysLeft: 0,
        trialStartsAt: null,
        trialEndsAt: null,
        isAdmin: false,
      };
    }

    // ── Layer 1: env-var admin bypass (no DB required) ──────────────────────
    if (isAdminByEnv(user.id, user.email)) {
      return {
        isInTrial: true,
        isExpired: false,
        daysLeft: 999,
        trialStartsAt: null,
        trialEndsAt: null,
        isAdmin: true,
      };
    }

    // ── Layer 2: profile query (account_type + trial dates) ─────────────────
    let profile: {
      account_type: string | null;
      trial_starts_at: string | null;
      trial_ends_at: string | null;
    } | null = null;

    try {
      // Select only account_type first (this column definitely exists)
      const { data: p } = await supabase
        .from("profiles")
        .select("account_type, trial_starts_at, trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();
      profile = p;
    } catch {
      // Column may not exist yet (migration 010 not applied) — fail open
      console.warn("[trial] Profile query error — defaulting to safe trial state");
    }

    // ── Layer 3: DB account_type admin bypass ────────────────────────────────
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

    // ── Check for active paid subscription ───────────────────────────────────
    try {
      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("status")
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      if (activeSub) {
        // Paid/trialing subscriber — full access, no expiry
        return {
          isInTrial: false,
          isExpired: false,
          daysLeft: 999,
          trialStartsAt: profile?.trial_starts_at
            ? new Date(profile.trial_starts_at)
            : null,
          trialEndsAt: profile?.trial_ends_at
            ? new Date(profile.trial_ends_at)
            : null,
          isAdmin: false,
        };
      }
    } catch {
      // Subscription query failed — don't penalize user, continue
    }

    // ── Trial date evaluation ────────────────────────────────────────────────

    // If profile is null or trial_ends_at is missing → columns may not exist yet
    // OR user hasn't been given trial dates yet. Either way: safe in trial.
    if (!profile || !profile.trial_ends_at) {
      return { ...SAFE_IN_TRIAL };
    }

    let trialEndsAt: Date;
    try {
      trialEndsAt = new Date(profile.trial_ends_at);
      if (isNaN(trialEndsAt.getTime())) {
        // Unparseable date — fail open
        console.warn("[trial] Unparseable trial_ends_at, defaulting to safe state");
        return { ...SAFE_IN_TRIAL };
      }
    } catch {
      return { ...SAFE_IN_TRIAL };
    }

    const trialStartsAt = profile.trial_starts_at
      ? new Date(profile.trial_starts_at)
      : null;
    const msLeft = trialEndsAt.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000));
    const isInTrial = msLeft > 0;

    return {
      isInTrial,
      isExpired: !isInTrial,
      daysLeft,
      trialStartsAt,
      trialEndsAt,
      isAdmin: false,
    };
  } catch (err) {
    // Catch-all: something unexpected failed — never lock the user out
    console.error("[trial] getTrialStatus unexpected error, safe state returned:", err);
    return { ...SAFE_IN_TRIAL };
  }
}
