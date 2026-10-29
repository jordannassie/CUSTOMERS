"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TrackAction } from "../AlsoRecommended";

/**
 * "+ Any business AI named" on Compare: the businesses AI named that you don't track. Picking one tracks it (the same
 * one click as "Also recommended by AI", within the plan's limit), then it shows as a chip to compare. No credits.
 */
export function AnyBusiness({ businessId, names, track }: { businessId: string; names: { name: string; answers: number }[]; track: TrackAction }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (names.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-[13px] font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        disabled={pending}
        data-testid="any-business"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
        Any business AI named
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Track one to compare with it. It counts toward your plan&apos;s competitors.</DropdownMenuLabel>
        {names.slice(0, 12).map((n) => (
          <DropdownMenuItem
            key={n.name}
            onSelect={() =>
              start(async () => {
                const result = await track({ businessId, name: n.name });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(`${n.name} is tracked. Pick it above to compare.`);
                router.refresh();
              })
            }
          >
            <span className="min-w-0 flex-1 truncate">{n.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{n.answers} answers</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
