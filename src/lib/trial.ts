/**
 * Trial / access status utilities — server-authoritative.
 *
 * Access is determined by PRODUCT_ACCESS.betaFreeAccess (in src/config/product-access.ts).
 *
 * CURRENT STATE (betaFreeAccess = true):
 *   getTrialStatus() returns full access for every authenticated user.
 *   trial_starts_at / trial_ends_at database fields are ignored for access.
 *   They are preserved in the DB for future use when billing is enabled.
 *
 * FUTURE STATE (betaFreeAccess = false):
 *   The trial date evaluation logic below takes effect and gates access
 *   based on trial expiry / active subscriptions.
 *
 * FAIL-OPEN DESIGN: Any DB error → safe "in trial" state, never "expired".
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_ACCESS } from "@/config/product-access";

// ─── Beta usage safeguards ────────────────────────────────────────────────────
// Internal cost-protection limits during beta.
// These are NOT presented as plan limits to users.

export const BETA_LIMITS = PRODUCT_ACCESS.betaLimits;

/**
 * @deprecated Use BETA_LIMITS during beta. Will be replaced by per-plan limits
 *   when billing is enabled.
 */
export const TRIAL_LIMITS = {
  maxBusinesses: BETA_LIMITS.maxBusinessesPerAccount,
  maxCompetitors: BETA_LIMITS.maxCompetitorsPerBusiness,
  maxPrompts: BETA_LIMITS.maxPromptsPerBusiness,
  maxManualScans: BETA_LIMITS.maxManualScansPerDay,
  seoRefreshCooldownHours: BETA_LIMITS.seoRefreshCooldownHours,
} as const;

// ─── Trial status ─────────────────────────────────────────────────────────────

export interface TrialStatus {
  /** User is within an active trial/beta window */
  isInTrial: boolean;
  /** Trial has ended (only ever true when betaFreeAccess = false) */
  isExpired: boolean;
  /** Whole days remaining — 999 for beta/admin/paid */
  daysLeft: number;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  /** true for admin accounts */
  isAdmin: boolean;
  /** true when betaFreeAccess mode is active — product is free for all users */
  isBeta: boolean;
}

/** Safe default — full access, never expired. Used on any error or beta mode. */
const FULL_ACCESS = Object.freeze({
  isInTrial: true,
  isExpired: false,
  daysLeft: 999,
  trialStartsAt: null,
  trialEndsAt: null,
  isAdmin: false,
  isBeta: true,
});

function parseEnvList(v: string | undefined): string[] {
  return (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function isAdminByEnv(userId: string, userEmail: string | null | undefined): boolean {
  const ids = parseEnvList(process.env.ADMIN_USER_IDS);
  if (ids.length && ids.includes(userId.toLowerCase())) return true;
  if (userEmail) {
    const emails = parseEnvList(process.env.ADMIN_EMAILS);
    if (emails.length && emails.includes(userEmail.toLowerCase())) return true;
  }
  return false;
}

/**
 * Returns the server-authoritative access status for the current user.
 *
 * During beta (PRODUCT_ACCESS.betaFreeAccess = true):
 *   Returns full access immediately after confirming auth. No DB trial queries.
 *
 * After beta (betaFreeAccess = false):
 *   Evaluates trial_ends_at and active subscriptions.
 *
 * Never throws. Returns FULL_ACCESS on any error.
 */
export async function getTrialStatus(): Promise<TrialStatus> {
  try {
    const supabase = await createClient();

    let user: { id: string; email?: string | null } | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    } catch {
      return { ...FULL_ACCESS };
    }

    if (!user) {
      // Not authenticated — return a clearly "no access" state so callers can redirect
      return {
        isInTrial: false,
        isExpired: false,
        daysLeft: 0,
        trialStartsAt: null,
        trialEndsAt: null,
        isAdmin: false,
        isBeta: PRODUCT_ACCESS.betaFreeAccess,
      };
    }

    // ── Admin bypass (env-var — no DB required) ──────────────────────────────
    if (isAdminByEnv(user.id, user.email)) {
      return { ...FULL_ACCESS, isAdmin: true };
    }

    // ── BETA MODE: all authenticated users get full access ───────────────────
    if (PRODUCT_ACCESS.betaFreeAccess) {
      return { ...FULL_ACCESS, isBeta: true };
    }

    // ── NORMAL MODE (betaFreeAccess = false) — evaluate trial/subscription ──

    let profile: {
      account_type: string | null;
      trial_starts_at: string | null;
      trial_ends_at: string | null;
    } | null = null;

    try {
      const { data: p } = await supabase
        .from("profiles")
        .select("account_type, trial_starts_at, trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();
      profile = p;
    } catch {
      console.warn("[trial] Profile query failed — defaulting to safe access");
      return { ...FULL_ACCESS, isBeta: false };
    }

    if (profile?.account_type === "admin") {
      return { ...FULL_ACCESS, isAdmin: true, isBeta: false };
    }

    try {
      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("status")
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();
      if (activeSub) {
        return {
          isInTrial: false,
          isExpired: false,
          daysLeft: 999,
          trialStartsAt: profile?.trial_starts_at ? new Date(profile.trial_starts_at) : null,
          trialEndsAt: profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null,
          isAdmin: false,
          isBeta: false,
        };
      }
    } catch {
      // Subscription query failed — don't penalize user
    }

    if (!profile?.trial_ends_at) {
      return { ...FULL_ACCESS, isBeta: false };
    }

    let trialEndsAt: Date;
    try {
      trialEndsAt = new Date(profile.trial_ends_at);
      if (isNaN(trialEndsAt.getTime())) return { ...FULL_ACCESS, isBeta: false };
    } catch {
      return { ...FULL_ACCESS, isBeta: false };
    }

    const trialStartsAt = profile.trial_starts_at ? new Date(profile.trial_starts_at) : null;
    const msLeft = trialEndsAt.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000));

    return {
      isInTrial: msLeft > 0,
      isExpired: msLeft <= 0,
      daysLeft,
      trialStartsAt,
      trialEndsAt,
      isAdmin: false,
      isBeta: false,
    };
  } catch (err) {
    console.error("[trial] getTrialStatus unexpected error, returning safe access:", err);
    return { ...FULL_ACCESS };
  }
}
