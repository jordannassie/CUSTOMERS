export type AuthFailure = "not_signed_in" | "forbidden" | "no_agency" | "agency_paused" | "agency_deleted" | "unavailable";

const MESSAGES: Record<AuthFailure, string> = {
  not_signed_in: "Please log in to continue.",
  forbidden: "You do not have access to this.",
  no_agency: "Finish setting up your account first.",
  agency_paused: "Your account is paused. Contact support to turn it back on.",
  agency_deleted: "This account was deleted.",
  unavailable: "We couldn't check your account just now. Try again in a moment.",
};

const STATUS: Record<AuthFailure, 401 | 403 | 503> = {
  not_signed_in: 401,
  forbidden: 403,
  no_agency: 403,
  agency_paused: 403,
  agency_deleted: 403,
  unavailable: 503,
};

export class AuthError extends Error {
  readonly status: 401 | 403 | 503;

  constructor(readonly reason: AuthFailure, options?: { cause?: unknown }) {
    super(MESSAGES[reason], options);
    this.name = "AuthError";
    this.status = STATUS[reason];
  }
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Server Actions return auth failures as data; anything else (including redirect()) is rethrown.
export function authFailure(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, status: error.status, error: error.message };
  throw error;
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
