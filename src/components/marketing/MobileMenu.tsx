"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LOGIN_HREF, NAV_LINKS, TRIAL_HREF, TRIAL_LABEL } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-xs gap-0 p-0">
        <div className="flex h-16 items-center border-b border-border px-4">
          <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
          <SheetDescription className="sr-only">Pages on Customers.Direct</SheetDescription>
        </div>
        <nav aria-label="Main" className="px-2 py-3">
          <ul className="flex flex-col">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex h-11 items-center rounded-md px-3 text-[15px] font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
          <Button asChild size="lg">
            <Link href={TRIAL_HREF} onClick={close}>
              {TRIAL_LABEL}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={LOGIN_HREF} onClick={close}>
              Log in
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
