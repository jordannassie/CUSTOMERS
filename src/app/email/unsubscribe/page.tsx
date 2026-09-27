import { Suspense } from "react";
import Link from "next/link";
import { CircleCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readUnsubscribeToken } from "@/modules/email";

export const metadata = { title: "Unsubscribe", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string | string[]; done?: string }> };

// Public: the link in an email opens this without a login. A button, not the visit itself, unsubscribes,
// so mail scanners that open links do not turn emails off.
export default function UnsubscribePage({ searchParams }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <Suspense fallback={<UnsubscribeSkeleton />}>
          <UnsubscribeContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

function UnsubscribeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-3 h-9 w-32" />
    </div>
  );
}

async function UnsubscribeContent({ searchParams }: Props) {
  const { token, done } = await searchParams;

  if (readUnsubscribeToken(token) === null) {
    return (
      <>
        <MailX className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">This link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the link from your latest email again, or turn emails off in your settings.
        </p>
        <Button asChild className="mt-6">
          <Link href="/settings">Go to settings</Link>
        </Button>
      </>
    );
  }

  if (done === "1") {
    return (
      <>
        <CircleCheck className="mx-auto size-10 text-good" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">You are unsubscribed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You will not get the weekly report email any more. You can turn it back on in your settings.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/settings">Go to settings</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <MailX className="mx-auto size-10 text-primary" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold text-foreground">Stop weekly report emails?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You will still get emails about your account, like billing and trial reminders.
      </p>
      <form action="/api/email/unsubscribe" method="post" className="mt-6">
        <input type="hidden" name="token" value={String(token)} />
        <Button type="submit">Unsubscribe</Button>
      </form>
    </>
  );
}
