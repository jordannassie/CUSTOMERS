import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminTwoFactor from "@/components/auth/AdminTwoFactor";
import { safeNextPath } from "@/lib/safe-next";
import { adminNeedsSecondFactor, requireAdminPassword } from "@/modules/auth";
import { startAdminAppSetup, verifyAdminCode } from "@/modules/auth/mfa/actions";
import { verifiedAppFactor } from "@/modules/auth/mfa/dal";

export const metadata = { title: "Verify it's you", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

// Where requireAdmin() sends an admin who signed in with a password only, when ADMIN_REQUIRE_MFA is on. Outside
// /internal/admin on purpose: that layout would send them straight back here.
export default function AdminVerifyPage({ searchParams }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Verify searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Verify({ searchParams }: Props) {
  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw, "/internal/admin");
  await requireAdminPassword({ next: `/admin-verify?next=${encodeURIComponent(next)}` });
  // Already confirmed, or the setting is off: nothing to ask.
  if (!(await adminNeedsSecondFactor())) redirect(next);
  return <AdminTwoFactor next={next} factorId={await verifiedAppFactor()} start={startAdminAppSetup} verify={verifyAdminCode} />;
}
