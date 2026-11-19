"use client";

import Link from "next/link";
import { ArrowLeft, ChevronsUpDown, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** "cd.admin@x.com" reads "CA": the first letter of the first two parts of the name before the @. */
export function initialsOf(email: string): string {
  const parts = (email.split("@")[0] ?? "").split(/[._+-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const ITEM = "gap-2.5 rounded-md px-2.5 py-2 text-[length:calc(13px*var(--px,1))] focus:bg-muted";

function Initials({ email }: { email: string }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[length:calc(11px*var(--px,1))] font-semibold text-primary" aria-hidden="true">
      {initialsOf(email)}
    </span>
  );
}

/**
 * The admin menu's foot (owner, 2026-11-16): who is signed in, as a card that opens Back to dashboard and Sign out.
 * Sign out is the same form the app's sidebar uses.
 */
export function AdminAccount({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-left outline-none transition-colors hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Signed in as ${email}. Account menu`}
        data-testid="admin-signed-in"
      >
        <Initials email={email} />
        <span className="min-w-0 flex-1">
          <span className="block text-[length:calc(13px*var(--px,1))] leading-snug font-medium text-foreground">Admin</span>
          <span className="block truncate text-[length:calc(11px*var(--px,1))] leading-snug text-muted-foreground" title={email}>
            {email}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      {/* The card's own width, so it stays inside the side menu: who is signed in, then two plain choices. */}
      <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-(--radix-dropdown-menu-trigger-width) p-1" data-testid="admin-account-menu">
        <DropdownMenuLabel className="mb-1 flex flex-col gap-0.5 rounded-md bg-muted px-2.5 py-2 font-normal">
          <span className="text-[length:calc(11px*var(--px,1))] leading-snug text-muted-foreground">Signed in as</span>
          <span className="truncate text-[length:calc(12px*var(--px,1))] leading-snug font-medium text-foreground" title={email}>
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/dashboard" onClick={onNavigate}>
            <ArrowLeft className="stroke-[1.75] text-muted-foreground" aria-hidden="true" />
            Back to dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild className={ITEM}>
            <button type="submit" className="w-full text-left">
              <LogOut className="stroke-[1.75] text-muted-foreground" aria-hidden="true" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
