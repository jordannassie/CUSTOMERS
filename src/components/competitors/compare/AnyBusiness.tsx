"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TrackAction } from "../AlsoRecommended";

/**
 * "+ Any business AI named" on Compare: the businesses AI named that you don't track. Picking one asks first, because
 * tracking takes one of the plan's competitor slots (audit 2026-11-12: one click used to track it straight away).
 * Then it shows as a chip to compare. No credits.
 */
export function AnyBusiness({ businessId, names, track }: { businessId: string; names: { name: string; answers: number }[]; track: TrackAction }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<string | null>(null);
  if (names.length === 0) return null;

  const confirm = () => {
    const name = asking;
    if (!name) return;
    start(async () => {
      const result = await track({ businessId, name });
      setAsking(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} is tracked. Pick it above to compare.`);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-dashed border-border px-2.5 text-[length:calc(13px*var(--px,1))] font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          disabled={pending}
          data-testid="any-business"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
          Any business AI named
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Track one to compare with it. It counts toward your plan&apos;s competitors.</DropdownMenuLabel>
          {names.slice(0, 12).map((n) => (
            <DropdownMenuItem key={n.name} onSelect={() => setAsking(n.name)}>
              <span className="min-w-0 flex-1 truncate">{n.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{n.answers} answers</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={asking !== null} onOpenChange={(open) => !open && !pending && setAsking(null)}>
        <DialogContent className="sm:max-w-md" data-testid="any-business-confirm">
          <DialogHeader>
            <DialogTitle>Track {asking}?</DialogTitle>
            <DialogDescription>
              It takes one of your plan&apos;s competitor places and shows up in every scan from now on. You can remove it later
              on <Link href="/competitors/manage" className="font-medium text-primary hover:underline">Manage competitors</Link>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Track it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
