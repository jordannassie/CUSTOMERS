import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { CurrentPath } from "@/components/site/CurrentPath";
import { StatusPage } from "@/components/site/StatusPage";
import { Button } from "@/components/ui/button";

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
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Open your dashboard</Link>
          </Button>
        </>
      }
    >
      <p>The link may be old or mistyped. Check the address, or start again from the homepage.</p>
    </StatusPage>
  );
}
