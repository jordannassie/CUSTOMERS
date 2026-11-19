import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN, passwordError } from "@/lib/password-rules";

// Inputs for the account actions (B-77). The current password is the re-check before a sign-in detail changes;
// accounts that sign in only with Google have none, so it is optional here and required by the action when set.
const currentPassword = z.string().max(200).optional();

export { PASSWORD_MIN };

export const changeEmailInput = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  currentPassword,
});

export const changePasswordInput = z.object({
  // The shared password rule (owner, 2026-11-18): length, upper and lower case, a number and a symbol.
  password: z.string().max(PASSWORD_MAX).refine((p) => passwordError(p) === null),
  currentPassword,
  // The code Supabase emails when it wants a fresh sign-in first (secure password change).
  nonce: z.string().trim().regex(/^\d{6,10}$/).optional(),
});

export const deleteBusinessInput = z.object({
  businessId: z.uuid(),
  confirmName: z.string().max(200),
});

export const deleteAccountInput = z.object({
  confirmName: z.string().max(200),
});
