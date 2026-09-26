import { Suspense } from "react";
import { redirect } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import { PAUSED_PATH, getCurrentAgency, isAgencyPaused, requireUser } from "@/modules/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading label="Loading your dashboard" />}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}

// Accounts without an agency still get in until onboarding creates one; paused ones do not.
async function AccountGate({ children }: { children: React.ReactNode }) {
  await requireUser({ next: "/dashboard" });
  const agency = await getCurrentAgency();
  if (agency && isAgencyPaused(agency.status)) redirect(PAUSED_PATH);
  return children;
}
