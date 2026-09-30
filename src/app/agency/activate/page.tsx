import type { Metadata } from "next";
import Link from "next/link";
import { requireLaunchKitUser } from "@/modules/launch-kit/access";
import { getAgencyProgramAccess } from "@/modules/launch-kit/dal";
import AcademyHeader from "@/components/launch-kit/AcademyHeader";
import StripeCheckoutButton from "@/components/launch-kit/StripeCheckoutButton";

export const metadata: Metadata = {
  title: "Activate agency software",
  robots: { index: false },
};

type SearchParams = Promise<{ checkout?: string }>;

export default async function AgencyActivatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { user } = await requireLaunchKitUser();
  const program = await getAgencyProgramAccess(user.id);
  const { checkout } = await searchParams;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <AcademyHeader />
      <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-12">
        {checkout === "canceled" ? (
          <p className="mb-6 border border-[#E5E5E1] bg-white rounded-[4px] px-4 py-3 text-[14px]">
            Checkout was canceled. Your Launch Kit access is unchanged. No Agency subscription was started.
          </p>
        ) : null}

        <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
          You have learned the business. Now activate the system that runs it.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-[#6B6B67]">
          The $97 kit is training. Agency software is a separate $199/month subscription
          you choose when you are ready to run reports for clients.
        </p>

        {program.active ? (
          <p className="mt-6 text-[14px] text-[#15803D]">
            Your Agency subscription is active.
            <Link href="/agency/success" className="ml-2 underline">
              View status
            </Link>
          </p>
        ) : null}

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <div className="border border-[#E5E5E1] rounded-[4px] bg-white p-6">
            <h2 className="text-[16px] font-semibold text-[#171717]">$97 Launch Kit</h2>
            <ul className="mt-4 space-y-2 text-[14px] text-[#6B6B67]">
              <li>Training</li>
              <li>Scripts</li>
              <li>Templates</li>
              <li>Pricing guidance</li>
              <li>Step-by-step agency plan</li>
            </ul>
          </div>
          <div className="border border-[#2563EB] rounded-[4px] bg-white p-6">
            <h2 className="text-[16px] font-semibold text-[#171717]">
              Customers.Direct Agency: $199/month
            </h2>
            <ul className="mt-4 space-y-2 text-[14px] text-[#6B6B67]">
              <li>AI visibility scans</li>
              <li>Prompt tracking</li>
              <li>Competitor tracking</li>
              <li>Client accounts</li>
              <li>White-label reports</li>
              <li>Recurring monitoring</li>
              <li>Agency dashboard</li>
            </ul>
          </div>
        </div>

        {!program.active ? (
          <div className="mt-8">
            <StripeCheckoutButton
              endpoint="/api/stripe/agency-program"
              label="Activate Customers.Direct Agency: $199/month"
            />
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="mt-8 inline-flex bg-[#2563EB] text-white text-[14px] font-semibold px-5 py-3 rounded-[4px]"
          >
            Open dashboard
          </Link>
        )}
      </main>
    </div>
  );
}
