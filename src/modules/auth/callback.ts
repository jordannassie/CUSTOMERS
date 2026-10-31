// Where /auth/callback sends a link or sign-in that did not work, and what the login page then says. Pure, so the
// wording for each kind of link is tested without Supabase.

/** Which kind of link or sign-in reached the callback. */
export type CallbackFlow = "signup" | "recovery" | "email_change" | "oauth";

/** Where the flow broke: Supabase sent an error, the link had no code, or the code or token did not verify. */
export type CallbackStage = "provider" | "missing" | "exchange";

// ForgotPasswordForm and account/dal.ts build these next paths; a Google sign-in never carries them.
const RECOVERY_NEXT = "/reset-password";
const EMAIL_CHANGE_NEXT = "/settings#account";
/** Read by the Settings page, which says the email change link did not work. */
export const EMAIL_LINK_PARAM = "email_link";

export function callbackFlow(params: URLSearchParams): CallbackFlow {
  const type = params.get("type");
  const from = params.get("from");
  const next = params.get("next");
  if (from === "signup" || type === "signup") return "signup";
  if (from === "reset" || type === "recovery" || next === RECOVERY_NEXT) return "recovery";
  if (from === "email_change" || type === "email_change" || next === EMAIL_CHANGE_NEXT) return "email_change";
  return "oauth";
}

/** Google sends error=access_denied when the person closes or cancels its sign-in screen. */
function cancelledByUser(params: URLSearchParams): boolean {
  const code = params.get("error_code");
  return params.get("error") === "access_denied" && (!code || code === "access_denied");
}

/**
 * The path to send a failed callback to. `usedCode` is true when the link carried a PKCE code: for a signup, that
 * code only fails in another browser, after Supabase has already confirmed the email.
 */
export function callbackFailurePath(flow: CallbackFlow, stage: CallbackStage, params: URLSearchParams, usedCode = false): string {
  switch (flow) {
    case "signup":
      return `/login?error=${stage === "exchange" && usedCode ? "signup_confirmed" : "signup_link_invalid"}`;
    case "recovery":
      return "/login?error=reset_link_invalid";
    case "email_change":
      // The person is usually signed in, and the login page would bounce them on to the dashboard.
      return `/settings?${EMAIL_LINK_PARAM}=invalid#account`;
    case "oauth":
      if (stage === "provider") return `/login?error=${cancelledByUser(params) ? "oauth_cancelled" : "oauth_provider_error"}`;
      return `/login?error=${stage === "missing" ? "missing_oauth_code" : "oauth_callback_failed"}`;
  }
}

export type LoginNotice =
  /** Google sign-in did not finish: shown with "Retry with Google". */
  | { kind: "google"; title: string; text: string }
  /** A link that did not work, or a cancelled sign-in: a plain message, with a link when there is a next step. */
  | { kind: "message"; tone: "error" | "warning"; text: string; link?: { href: string; label: string } };

/**
 * What the login form shows for the page's ?error= value, or null for none or one it does not know. The login page
 * words the signup link ones (signup_confirmed, signup_link_invalid) itself.
 */
export function loginNotice(error: string | null | undefined): LoginNotice | null {
  switch (error) {
    case "oauth_cancelled":
      return { kind: "message", tone: "warning", text: "Google sign-in was canceled. Try again, or log in with your email." };
    case "reset_link_invalid":
      return {
        kind: "message",
        tone: "error",
        text: "This password reset link didn't work. It may have expired, been used already or been opened in another browser. Ask for a new one.",
        link: { href: "/forgot-password", label: "Send a new reset link" },
      };
    case "oauth_provider_error":
      return { kind: "google", title: "Google sign-in didn't finish.", text: "This is usually temporary." };
    case "oauth_callback_failed":
    case "missing_oauth_code":
      return {
        kind: "google",
        title: "Sign-in couldn't complete. Please try again.",
        text: "Google signed you in, but we couldn't save your login. This is usually temporary.",
      };
    default:
      return null;
  }
}

/** The Settings notice for a failed email change link (?email_link=invalid). */
export const EMAIL_LINK_INVALID_TEXT =
  "That email change link didn't work. It may have expired or been used already. Check the email below, and change it again for a new link if needed.";
