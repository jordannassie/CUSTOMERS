"use server";

import { refresh } from "next/cache";
import {
  AuthError,
  authFailure,
  DELETED_PATH,
  getCurrentAgency,
  isAgencyPaused,
  requireAgency,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/modules/auth";
import { endBusinessPlan, PlanChangeError, type BusinessPlanEnd } from "@/modules/billing";
import {
  deletionWaitDays,
  hasPasswordSignIn,
  passwordMatches,
  readAgencyForDelete,
  readBusinessName,
  sendReauthenticationCode,
  signOutEverywhere,
  softDeleteAgency,
  softDeleteBusiness,
  updateEmail,
  updatePassword,
} from "./dal";
import { accountDeletedEmail, businessDeletedEmail } from "./emails";
import { changeEmailInput, changePasswordInput, deleteAccountInput, deleteBusinessInput } from "./schema";
import { sendSafely } from "./send";
import { authUpdateError, confirmsName, purgeDate } from "./service";
import { accountStripeClient } from "./stripe";

// Account management (B-77, MVP_SPEC 23, ACC-01 to ACC-04). Each action checks auth and input itself.

const WRONG_PASSWORD = { ok: false, status: 400, error: "Your current password is not right. Try again." } as const;
const STRIPE_DOWN = {
  ok: false,
  status: 502,
  error: "We couldn't reach our payment provider, so nothing was deleted. Try again in a minute.",
} as const;

/** A signed-in user whose account is not suspended or deleted. Users still setting up have no agency yet. */
async function activeUser(): Promise<SessionUser> {
  const user = await requireUser();
  const agency = await getCurrentAgency();
  if (agency && isAgencyPaused(agency.status)) throw new AuthError(agency.status === "deleted" ? "agency_deleted" : "agency_paused");
  return user;
}

/** Accounts with a password must give it again before a sign-in detail changes. */
async function recheckPassword(user: SessionUser, current: string | undefined): Promise<boolean> {
  if (!(await hasPasswordSignIn())) return true;
  return !!current && !!user.email && (await passwordMatches(user.email, current));
}

export async function changeEmail(input: unknown): Promise<ActionResult<{ pendingEmail: string }>> {
  try {
    const user = await activeUser();
    const parsed = changeEmailInput.safeParse(input);
    if (!parsed.success) return { ok: false, status: 400, error: "Enter a valid email address." };
    const { email, currentPassword } = parsed.data;
    if (email === user.email?.toLowerCase()) return { ok: false, status: 400, error: "That is already your email." };
    if (!(await recheckPassword(user, currentPassword))) return WRONG_PASSWORD;

    const result = await updateEmail(email);
    if (!result.ok) {
      console.error("[account] email change failed", result.code, result.message);
      return { ok: false, status: 400, error: authUpdateError(result.code, "We couldn't change your email. Try again in a minute.") };
    }
    refresh();
    return { ok: true, data: { pendingEmail: email } };
  } catch (error) {
    return authFailure(error);
  }
}

export type PasswordChange = { step: "done" } | { step: "code_sent" };

export async function changePassword(input: unknown): Promise<ActionResult<PasswordChange>> {
  try {
    const user = await activeUser();
    const parsed = changePasswordInput.safeParse(input);
    if (!parsed.success) return { ok: false, status: 400, error: "Use at least 8 characters for your new password." };
    const { password, currentPassword, nonce } = parsed.data;
    if (!(await hasPasswordSignIn())) {
      return { ok: false, status: 400, error: "You sign in with Google, so there is no password to change here." };
    }
    if (!(await recheckPassword(user, currentPassword))) return WRONG_PASSWORD;

    const result = await updatePassword(password, nonce);
    if (result.ok) return { ok: true, data: { step: "done" } };
    // With secure password change on, Supabase wants a code from the user's inbox when the sign-in is not recent.
    if (result.code === "reauthentication_needed" && !nonce) {
      const sent = await sendReauthenticationCode();
      if (sent.ok) return { ok: true, data: { step: "code_sent" } };
      return { ok: false, status: 400, error: authUpdateError(sent.code, "We couldn't send the code. Try again in a minute.") };
    }
    console.error("[account] password change failed", result.code, result.message);
    return { ok: false, status: 400, error: authUpdateError(result.code, "We couldn't change your password. Try again in a minute.") };
  } catch (error) {
    return authFailure(error);
  }
}

export async function deleteBusiness(input: unknown): Promise<ActionResult<{ purgeAt: string; planEndsAt: string | null }>> {
  try {
    const { user, agency } = await requireAgency();
    const parsed = deleteBusinessInput.safeParse(input);
    if (!parsed.success) return { ok: false, status: 400, error: "Type the business name to confirm." };
    const { businessId, confirmName } = parsed.data;
    const name = await readBusinessName(agency.id, businessId);
    if (!name) return { ok: false, status: 404, error: "Business not found. It may already be deleted." };
    if (!confirmsName(confirmName, name)) {
      return { ok: false, status: 400, error: "The name you typed doesn't match. Type it exactly as shown." };
    }

    // Billing first: if Stripe refuses, the business stays as it was.
    let plan: BusinessPlanEnd;
    try {
      plan = await endBusinessPlan(agency.id, businessId);
    } catch (error) {
      if (error instanceof PlanChangeError) return { ok: false, status: error.status, error: error.message };
      console.error("[account] business plan end failed", error);
      return STRIPE_DOWN;
    }

    const purgeAt = purgeDate(new Date(), deletionWaitDays());
    if (!(await softDeleteBusiness(agency.id, businessId, purgeAt))) {
      return { ok: false, status: 409, error: "This business was already deleted." };
    }
    if (user.email) {
      await sendSafely(
        businessDeletedEmail({ to: user.email, agencyId: agency.id, businessId, businessName: name, planEndsAt: plan.endsAt, purgeAt }),
      );
    }
    refresh();
    return { ok: true, data: { purgeAt: purgeAt.toISOString(), planEndsAt: plan.endsAt } };
  } catch (error) {
    return authFailure(error);
  }
}

export async function deleteAccount(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const { user, agency } = await requireAgency();
    const parsed = deleteAccountInput.safeParse(input);
    if (!parsed.success) return { ok: false, status: 400, error: "Type your agency name to confirm." };
    const target = await readAgencyForDelete(agency.id);
    if (!confirmsName(parsed.data.confirmName, target.name)) {
      return { ok: false, status: 400, error: "The name you typed doesn't match. Type it exactly as shown." };
    }

    // Cancel first, with no refund (MVP_SPEC 23): if Stripe refuses, the account stays as it was.
    if (target.subscriptionId) {
      const stripe = accountStripeClient();
      if (!stripe) return STRIPE_DOWN;
      try {
        await stripe.cancelNow(target.subscriptionId, `account-delete:${agency.id}`);
      } catch (error) {
        console.error("[account] subscription cancel failed", error);
        return STRIPE_DOWN;
      }
    }

    const purgeAt = purgeDate(new Date(), deletionWaitDays());
    if (!(await softDeleteAgency(agency.id, purgeAt))) {
      return { ok: false, status: 409, error: "This account was already deleted." };
    }
    if (user.email) {
      await sendSafely(accountDeletedEmail({ to: user.email, agencyId: agency.id, agencyName: target.name, purgeAt }));
    }
    await signOutEverywhere();
    return { ok: true, data: { redirectTo: DELETED_PATH } };
  } catch (error) {
    return authFailure(error);
  }
}
