"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Box, Frame } from "@/components/app/PageSkeletons";
import { PHONE_QUERY, useMediaQuery, useStoredChoice } from "@/lib/use-media-query";

const VIEWS = ["board", "list"] as const;

/**
 * Actions while it loads, in the view the page will open in (owner, 2026-11-17: the loading screen was a stack of
 * cards, the page a board): the view the user picked here before, else the board, or the list on a phone.
 */
export function ActionsSkeleton() {
  const [stored] = useStoredChoice("actions-view", VIEWS);
  const phone = useMediaQuery(PHONE_QUERY);
  const view = stored ?? (phone ? "list" : "board");

  return (
    <Frame>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-[calc(520px*var(--px,1))] max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-32" />
        ))}
      </div>
      <Box className="gap-2 py-4">
        <Skeleton className="h-5 w-full max-w-3xl" />
      </Box>
      {view === "board" ? (
        <div className="-mx-4 overflow-x-hidden px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-[repeat(4,minmax(calc(245px*var(--px,1)),1fr))] gap-3">
            {Array.from({ length: 4 }, (_, column) => (
              <div key={column} className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-2.5">
                {/* Darker than the grey column, or the column's title would not show while it loads. */}
                <Skeleton className="h-5 w-28 bg-foreground/10" />
                {Array.from({ length: column === 3 ? 1 : 2 }, (_, card) => (
                  <div key={card} className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-9" />
                    <Skeleton className="h-7 w-2/5 self-end" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {Array.from({ length: 2 }, (_, section) => (
            <div key={section} className="border-b border-border last:border-b-0">
              <div className="border-b border-border bg-muted/60 px-4 py-2">
                <Skeleton className="h-4 w-28" />
              </div>
              {Array.from({ length: 3 }, (_, row) => (
                <div key={row} className="flex items-start gap-4 border-b border-border px-4 py-3 last:border-b-0">
                  <Skeleton className="h-5 w-14" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                  <Skeleton className="hidden h-8 w-24 sm:block" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}
