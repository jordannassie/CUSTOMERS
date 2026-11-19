import { Suspense } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, getCurrentUser } from "@/modules/auth";
import { MobileMenu } from "./MobileMenu";
import { DASHBOARD_HREF, LOGIN_HREF, TRIAL_HREF, TRIAL_LABEL } from "./nav";

// The header's account buttons (owner, 2026-11-17): Log in and Start free trial for visitors, Dashboard for someone who
// is signed in. The check reads the session cookie, so it streams in after the cached page (Cache Components), and the
// rest of the public page stays static.

/** A check that fails (Supabase slow or down) reads as signed out: the public page must still load. */
async function signedIn(): Promise<boolean> {
  try {
    return (await getCurrentUser()) !== null;
  } catch (error) {
    if (error instanceof AuthError) return false;
    throw error;
  }
}

function SignedOut() {
  return (
    <>
      <Button asChild variant="ghost">
        <Link href={LOGIN_HREF}>Log in</Link>
      </Button>
      <Button asChild>
        <Link href={TRIAL_HREF}>{TRIAL_LABEL}</Link>
      </Button>
    </>
  );
}

async function DesktopButtons() {
  if (!(await signedIn())) return <SignedOut />;
  return (
    // A filled button right after the Mr. Direct picture needs more room than the ghost Log in gets (owner, 2026-11-17).
    <Button asChild className="ml-2">
      <Link href={DASHBOARD_HREF}>
        <LayoutDashboard aria-hidden="true" />
        Dashboard
      </Link>
    </Button>
  );
}

async function MobileButtons() {
  return <MobileMenu account={(await signedIn()) ? "signed-in" : "signed-out"} />;
}

/** Desktop: until the check answers, the visitor buttons hold the space unseen, so nothing jumps and nothing flashes. */
export function HeaderAccount() {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true" className="invisible flex items-center gap-2">
          <SignedOut />
        </div>
      }
    >
      <DesktopButtons />
    </Suspense>
  );
}

/** Phone: the menu opens straight away; its account buttons appear once the check answers. */
export function HeaderMobileMenu() {
  return (
    <Suspense fallback={<MobileMenu account="unknown" />}>
      <MobileButtons />
    </Suspense>
  );
}
