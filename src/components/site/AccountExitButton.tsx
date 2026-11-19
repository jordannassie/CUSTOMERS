import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth";

// The second button on the account deleted and paused pages: Log out for a signed-in visitor, Log in for anyone else
// (these pages are also reachable by an old link after logging out).
export function AccountExitButton() {
  return (
    <Suspense fallback={<LogInButton />}>
      <ExitButton />
    </Suspense>
  );
}

async function ExitButton() {
  const user = await getCurrentUser();
  if (!user) return <LogInButton />;
  return (
    <form action="/auth/signout" method="post">
      <Button type="submit" variant="outline" className="w-full">
        Log out
      </Button>
    </form>
  );
}

function LogInButton() {
  return (
    <Button asChild variant="outline">
      <Link href="/login">Log in</Link>
    </Button>
  );
}
