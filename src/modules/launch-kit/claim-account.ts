"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireStripe } from "@/lib/stripe";
import { applyLaunchKitCheckoutSession } from "./webhook";
import { createAccountAfterPurchaseSchema } from "./schema";
import { LAUNCH_KIT_PRODUCT } from "./pricing";

export async function createAcademyAccountAfterPurchase(formData: FormData): Promise<{
  error?: string;
  email?: string;
}> {
  const parsed = createAccountAfterPurchaseSchema.safeParse({
    sessionId: formData.get("sessionId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a password with at least 8 characters." };
  }

  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    return { error: "Billing is not configured." };
  }

  const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
  if (session.payment_status !== "paid") {
    return { error: "We could not confirm that payment. Refresh this page or contact support." };
  }
  if (session.metadata?.product && session.metadata.product !== LAUNCH_KIT_PRODUCT) {
    return { error: "This checkout is not for the Launch Kit." };
  }

  await applyLaunchKitCheckoutSession(session);

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    ""
  ).trim().toLowerCase();
  if (!email) {
    return { error: "Stripe did not return an email for this payment. Log in with the email you used at checkout." };
  }

  const svc = createServiceClient();
  const { error } = await svc.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error: "An account with this email already exists. Log in to open the Academy.",
        email,
      };
    }
    return { error: "We could not create the account. Try logging in, or use a different password." };
  }

  return { email };
}
