"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { StatusPage } from "@/components/site/StatusPage";
import { Button } from "@/components/ui/button";

// Shared by error.tsx and global-error.tsx. The digest lets support find the server log line.
export function CrashPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      icon={RotateCw}
      title="This page didn't load"
      detail={error.digest ? { label: "Reference for support", value: error.digest } : undefined}
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </>
      }
    >
      <p>
        Something went wrong on our side, not yours. Your scans, credits and settings are safe. Try again, and if it
        keeps happening, contact us with the reference below.
      </p>
    </StatusPage>
  );
}
