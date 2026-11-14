import { Suspense } from "react";
import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { CurrentPath } from "@/components/site/CurrentPath";
import { StatusPage } from "@/components/site/StatusPage";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth";

export function NotFoundPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <StatusPage
      icon={MapPinOff}
      title="We can't find that page"
      detail={{ label: "Address you opened", value: <CurrentPath /> }}
      embedded={embedded}
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">Go to the homepage</Link>
          </Button>
          <Suspense fallback={<SecondButton signedIn={false} />}>
            <DashboardButton />
          </Suspense>
        </>
      }
    >
      <p>The link may be old or mistyped. Check the address, or start again from the homepage.</p>
    </StatusPage>
  );
}

// Signed in: straight to the dashboard. Anyone else: log in. The page shell is prerendered; only this button waits
// for the session, so the address shown above stays the same on server and client (no hydration error #418).
async function DashboardButton() {
  return <SecondButton signedIn={Boolean(await getCurrentUser())} />;
}

function SecondButton({ signedIn }: { signedIn: boolean }) {
  return (
    <Button asChild size="lg" variant="outline">
      {signedIn ? <Link href="/dashboard">Go to dashboard</Link> : <Link href="/login">Log in</Link>}
    </Button>
  );
}
