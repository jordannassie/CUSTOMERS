// The sign-up and login helpers behind AuthForm, split out to keep it under the size limit (2026-11-16). Behaviour is
// unchanged: the same next page, plan and wording for each Supabase error.
import { appUrl } from "@/lib/app-url";
import { safeNextPath } from "@/lib/safe-next";
import { createClient, googleSignInEnabled } from "@/lib/supabase/browser";

// The page the visitor asked for before being sent to log in (BUG-009). A plan picked on the pricing
// page (?plan=) is carried into onboarding, which keeps it for the card step (MVP_SPEC 3.1 step 0).
// A new account goes straight to setup: /dashboard only redirected there, one more server trip (2026-10-23).
export function pickedPlan(): "starter" | "pro" | null {
  const plan = new URLSearchParams(window.location.search).get("plan");
  return plan === "starter" || plan === "pro" ? plan : null;
}

export function nextFromUrl(signup = false) {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");
  const fallback = plan === "starter" || plan === "pro" ? `/onboarding?plan=${plan}` : signup ? "/onboarding" : undefined;
  return safeNextPath(params.get("next"), fallback);
}

/** What the form shows for a failed sign-up or login: a form alert, which fields it is about, or a password note. */
export type AuthFailure = { error?: string; invalid?: "email" | "password" | "both"; passwordError?: string };

export function signupFailure(message: string): AuthFailure {
  const msg = message.toLowerCase();
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
    return { error: "An account with this email already exists. Try logging in instead.", invalid: "email" };
  }
  if (msg.includes("password")) return { passwordError: "Password must be at least 8 characters." };
  return { error: "We couldn't create your account. Try again." };
}

export function loginFailure(code: string | undefined, message: string): AuthFailure {
  const msg = message.toLowerCase();
  // Checked first: "Email not confirmed" would otherwise read as a wrong password.
  if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
    return { error: "Confirm your email first. Open the link we sent you, then log in.", invalid: "email" };
  }
  if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password") || msg.includes("email")) {
    return { error: "Email or password is incorrect.", invalid: "both" };
  }
  if (msg.includes("not found") || msg.includes("no user")) return { error: "No account found with that email.", invalid: "email" };
  return { error: "We couldn't log you in. Try again." };
}

/** Starts Google sign-in; returns what to show when it can't start, or null while the browser leaves for Google. */
export async function startGoogleSignIn(): Promise<{ title: string; text: string } | null> {
  if (!(await googleSignInEnabled())) return { title: "Google sign-in isn't available right now.", text: "Log in with your email instead." };
  // The configured address, so the OAuth redirect URI matches what is registered in Google Cloud Console and
  // Supabase, and the PKCE code-verifier cookie is on the right domain. The page's own address only in development.
  const callbackUrl = `${appUrl()}/auth/callback?next=${encodeURIComponent(nextFromUrl())}`;
  const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl } });
  return error ? { title: "Google sign-in didn't start.", text: "This is usually temporary." } : null;
}

export type EmailAuthResult = { kind: "failed"; failure: AuthFailure } | { kind: "confirm" } | { kind: "signed_in"; next: string };

export async function signUpWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  const plan = pickedPlan();
  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback?from=signup&next=${encodeURIComponent(nextFromUrl(true))}`,
      // Kept on the account too, so the plan survives a confirmation link opened in another browser (agency step).
      ...(plan && { data: { selected_plan: plan } }),
    },
  });
  if (error) return { kind: "failed", failure: signupFailure(error.message) };
  // With email confirmation off, signUp already returns a session. One navigation: the page it opens is read with
  // the new session's cookie, so a refresh after it only fetched the same page again.
  return data.session ? { kind: "signed_in", next: nextFromUrl(true) } : { kind: "confirm" };
}

export async function logInWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  return error ? { kind: "failed", failure: loginFailure(error.code, error.message) } : { kind: "signed_in", next: nextFromUrl() };
}
