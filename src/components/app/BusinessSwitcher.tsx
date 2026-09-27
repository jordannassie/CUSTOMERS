"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SwitcherBusiness = { id: string; name: string; domain: string | null; logoUrl: string | null };
export type SwitchBusinessAction = (
  input: { businessId: string },
) => Promise<{ ok: true } | { ok: false; error: string }>;

function BusinessMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logos come from any domain the user entered
      <img
        src={logoUrl}
        alt=""
        className="size-6 shrink-0 rounded-sm border border-border bg-surface object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-tint text-[11px] font-semibold text-primary-hover"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function BusinessSwitcher({
  businesses,
  activeBusinessId,
  switchBusiness,
  onSwitched,
}: {
  businesses: SwitcherBusiness[];
  activeBusinessId: string;
  switchBusiness: SwitchBusinessAction;
  onSwitched?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const active = businesses.find((b) => b.id === activeBusinessId) ?? businesses[0];

  function choose(id: string) {
    if (id === active.id) return;
    setTarget(id);
    startTransition(async () => {
      const result = await switchBusiness({ businessId: id });
      if (result.ok) onSwitched?.();
      else toast.error(result.error);
      setTarget(null);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-2 text-left outline-none transition-colors hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Business: ${active.name}. Switch business`}
        data-testid="business-switcher"
      >
        <BusinessMark name={active.name} logoUrl={active.logoUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{active.name}</span>
          {active.domain && <span className="block truncate text-xs text-muted-foreground">{active.domain}</span>}
        </span>
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Switching" />
        ) : (
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        {businesses.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onSelect={() => choose(b.id)}
            disabled={pending}
            className="gap-2.5 py-2"
            aria-current={b.id === active.id ? "true" : undefined}
          >
            <BusinessMark name={b.name} logoUrl={b.logoUrl} />
            <span className="min-w-0 flex-1 truncate">{b.name}</span>
            {target === b.id ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <Check className={cn("size-4 text-primary", b.id !== active.id && "invisible")} aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2.5 py-2 text-muted-foreground">
          <Link href="/dashboard/add-business" onClick={onSwitched}>
            <Plus className="size-4" aria-hidden="true" />
            Add business
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
