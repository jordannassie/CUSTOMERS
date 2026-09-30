import type { Metadata } from "next";
import Link from "next/link";
import { requireStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { applyLaunchKitCheckoutSession } from "@/modules/launch-kit/webhook";
import { claimPurchasesForUser, getLaunchKitAccess } from "@/modules/launch-kit/dal";
import { firstIncompleteLessonPath } from "@/modules/launch-kit/curriculum";
import { JOURNEY_STEPS } from "@/modules/launch-kit/curriculum";
import FunnelHeader from "@/components/launch-kit/FunnelHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ClaimAccountForm from "@/components/launch-kit/ClaimAccountForm";
import { LAUNCH_KIT_PRODUCT } from "@/modules/launch-kit/pricing";

export const metadata: Metadata = {
  title: "You are in",
  robots: { index: false },
};

type SearchParams = Promise<{ session_id?: string; claimed?: string }>;

export default async function LaunchKitSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id: sessionId, claimed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let paymentOk = claimed === "1";
  let paymentError: string | null = null;

  if (sessionId) {
    try {
      const stripe = requireStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const product = session.metadata?.product;
      if (session.payment_status === "paid" && (!product || product === LAUNCH_KIT_PRODUCT)) {
        await applyLaunchKitCheckoutSession(session);
        paymentOk = true;
      } else if (session.status === "open") {
        paymentError = "Payment is still processing. Refresh this page in a moment.";
      } else if (!paymentOk) {
        paymentError = "We could not confirm this payment yet. If you were charged, log in and open the Academy.";
      }
    } catch {
      paymentError = "We could not verify checkout. If you were charged, log in with the email from Stripe.";
    }
  }

  if (user?.email) {
    await claimPurchasesForUser(user.id, user.email);
  }
  const access = await getLaunchKitAccess({ userId: user?.id, email: user?.email });
  const entitled = access.launchKitPurchased || paymentOk;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <FunnelHeader cta={false} />
      <main className="flex-1 max-w-[720px] mx-auto px-4 py-16">
        {paymentError && !entitled ? (
          <div>
            <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
              Checking your payment
            </h1>
            <p className="mt-4 text-[15px] text-[#6B6B67]">{paymentError}</p>
            <Link href="/start-ai-business" className="mt-6 inline-block text-[#2563EB] text-[14px] font-medium">
              Back to the Launch Kit
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.03em] text-[#171717]">
              You are in. Your AI business starts now.
            </h1>
            <p className="mt-4 text-[16px] leading-7 text-[#6B6B67]">
              You now have access to the Customers.Direct AI Business Launch Kit.
              Start with the first lesson, then work through each step until you
              are ready to activate the software and begin serving clients.
            </p>

            {user && entitled ? (
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href={firstIncompleteLessonPath(new Set())}
                  className="inline-flex items-center justify-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold px-5 py-3 rounded-[4px]"
                >
                  Start module 1
                </Link>
                <Link
                  href="/academy"
                  className="inline-flex items-center justify-center border border-[#E5E5E1] bg-white text-[14px] font-semibold px-5 py-3 rounded-[4px] text-[#171717]"
                >
                  View my Academy
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-6 text-[14px] text-[#171717]">
                  Create your login with the email you used at checkout to open the Academy.
                </p>
                {sessionId ? (
                  <ClaimAccountForm sessionId={sessionId} />
                ) : (
                  <Link
                    href="/login?next=/academy"
                    className="mt-4 inline-flex bg-[#2563EB] text-white text-[14px] font-semibold px-5 py-3 rounded-[4px]"
                  >
                    Log in
                  </Link>
                )}
              </>
            )}

            <ol className="mt-12 space-y-3">
              {JOURNEY_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-3 border border-[#E5E5E1] rounded-[4px] bg-white px-4 py-3"
                >
                  <span
                    className={`w-7 h-7 rounded-[4px] text-[12px] font-semibold flex items-center justify-center ${
                      index === 0
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#F5F5F2] text-[#6B6B67]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[14px] text-[#171717]">{step}</span>
                  {index === 0 ? (
                    <span className="ml-auto text-[12px] font-medium text-[#2563EB]">Active</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
