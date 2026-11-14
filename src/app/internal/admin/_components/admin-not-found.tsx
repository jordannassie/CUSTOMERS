"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setMissingPath } from "./nav-items";

/**
 * Not found inside the admin shell, pointing back to the list the admin came from (UI-033). With `unknownAddress`
 * (no admin page at this address at all), the menu and the breadcrumb stop pointing at the section in the address.
 */
export default function AdminNotFound({ title, text, backHref, backLabel, unknownAddress = false }: {
  title: string;
  text: string;
  backHref: string;
  backLabel: string;
  unknownAddress?: boolean;
}) {
  const pathname = usePathname();
  useEffect(() => {
    if (!unknownAddress) return;
    setMissingPath(pathname);
    return () => setMissingPath(null);
  }, [unknownAddress, pathname]);

  return (
    <div className="mx-auto w-full max-w-[calc(1200px*var(--px,1))] px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center">
        <SearchX aria-hidden className="size-6 text-text-hint" />
        <h1 className="text-[length:calc(15px*var(--px,1))] font-medium">{title}</h1>
        <p className="max-w-sm text-[length:calc(14px*var(--px,1))] text-muted-foreground">{text}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
