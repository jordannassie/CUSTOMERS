export type AuthFailure = "not_signed_in" | "forbidden" | "no_agency" | "agency_paused";

const MESSAGES: Record<AuthFailure, string> = {
  not_signed_in: "Please log in to continue.",
  forbidden: "You do not have access to this.",
  no_agency: "Finish setting up your account first.",
  agency_paused: "Your account is paused. Contact support to turn it back on.",
};

export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(readonly reason: AuthFailure) {
    super(MESSAGES[reason]);
    this.name = "AuthError";
    this.status = reason === "not_signed_in" ? 401 : 403;
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
