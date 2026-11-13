import "server-only";
import { createClient } from "@/lib/supabase/server";

// The authenticator app (TOTP) steps of an admin sign-in (ADMIN_REQUIRE_MFA), through Supabase Auth with the
// signed-in session's cookies. Callers check requireAdminPassword() first.

export type Enrollment = { ok: true; factorId: string; qrCode: string; secret: string } | { ok: false; error: string };

// Supabase answers this when authenticator apps are switched off for the project (auth.mfa.totp in config.toml, or
// Authentication > Multi-Factor in the dashboard).
const OFF = /disabled|not enabled|mfa_totp_enroll_not_enabled/i;

/** The id of this user's working authenticator app, or null when none is set up yet. */
export async function verifiedAppFactor(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(`Could not read the sign-in factors: ${error.message}`);
  return data.totp[0]?.id ?? null;
}

/** Starts setting up an authenticator app: a QR code and the secret to type in instead. Unfinished set-ups go first. */
export async function startAppEnrollment(): Promise<Enrollment> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Admin app ${new Date().toISOString().slice(0, 16)}` });
  if (error || !data) {
    return {
      ok: false,
      error: OFF.test(error?.message ?? "")
        ? "Authenticator apps are switched off for this site, so this can't be set up yet. Ask the developer to turn them on."
        : "We couldn't start setting up the app. Try again in a moment.",
    };
  }
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Checks a 6-digit code; a right one upgrades this session to aal2 (the cookies are refreshed). */
export async function verifyAppCode(factorId: string, code: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return !error;
}
