import type { Metadata } from "next";
import Link from "next/link";
import { requireLaunchKitUser } from "@/modules/launch-kit/access";
import { getAgencyProgramAccess } from "@/modules/launch-kit/dal";
import { applyAgencySubscription } from "@/modules/launch-kit/webhook";
import { requireStripe } from "@/lib/stripe";
import { AGENCY_PROGRAM_PRODUCT } from "@/modules/launch-kit/constants";
import AcademyHeader from "@/components/launch-kit/AcademyHeader";

export const metadata: Metadata = {
  title: "Agency activated",
  robots: { index: false },
};

type SearchParams = Promise<{ session_id?: string }>;

export default async function AgencySuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { user } = await requireLaunchKitUser();
  const { session_id: sessionId } = await searchParams;

  if (sessionId) {
    try {
      const stripe = requireStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const product = session.metadata?.product;
      if (
        session.mode === "subscription" &&
        session.subscription &&
        (!product || product === AGENCY_PROGRAM_PRODUCT)
      ) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        subscription.metadata = { ...session.metadata, ...subscription.metadata };
        await applyAgencySubscription(subscription);
      }
    } catch {
      // Webhook may still complete; page re-reads status below.
    }
  }

  const program = await getAgencyProgramAccess(user.id);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <AcademyHeader />
      <main className="max-w-[640px] mx-auto px-4 py-16">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
          {program.active ? "Agency software is on." : "Finishing your subscription"}
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-[#6B6B67]">
          {program.active
            ? "You can add clients, run AI visibility reports, and send monthly updates from the dashboard."
            : "If you just paid, wait a few seconds and refresh. Academy access stays available even if this subscription is delayed."}
        </p>

        <dl className="mt-8 border border-[#E5E5E1] rounded-[4px] bg-white divide-y divide-[#E5E5E1]">
          <div className="px-4 py-3 flex justify-between text-[14px]">
            <dt className="text-[#6B6B67]">Plan</dt>
            <dd className="text-[#171717] font-medium">Agency · $199/month</dd>
          </div>
          <div className="px-4 py-3 flex justify-between text-[14px]">
            <dt className="text-[#6B6B67]">Status</dt>
            <dd className="text-[#171717] font-medium">{program.status ?? "not started"}</dd>
          </div>
          <div className="px-4 py-3 flex justify-between text-[14px]">
            <dt className="text-[#6B6B67]">Launch Kit</dt>
            <dd className="text-[#171717] font-medium">Active</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-[#2563EB] text-white text-[14px] font-semibold px-5 py-3 rounded-[4px]"
          >
            Open agency dashboard
          </Link>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center justify-center border border-[#E5E5E1] bg-white text-[14px] font-semibold px-5 py-3 rounded-[4px]"
          >
            Manage billing
          </Link>
        </div>
      </main>
    </div>
  );
}
