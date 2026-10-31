"use client";

import { useState } from "react";
import { CalendarDays, Check, CircleDashed, CircleDot } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ProductFrame } from "./ProductFrame";

type Status = "suggested" | "doing" | "done";
type Fix = { id: string; where: string; title: string; detail: string; impact: "High" | "Medium"; status: Status };

const FIXES: Fix[] = [
  { id: "reviews", where: "Google Business Profile", title: "Get more Google reviews", detail: "Daily Grind has 320 Google reviews at 4.7. You have 12 at 4.2.", impact: "High", status: "suggested" },
  { id: "oat-milk", where: "Your website", title: "Add a page about your oat milk drinks", detail: "AI named Brew Lab for oat milk questions and cited its menu page.", impact: "Medium", status: "suggested" },
  { id: "yelp", where: "yelp.com", title: "Claim your Yelp listing", detail: "Yelp was used in 14 answers that named Daily Grind and not you.", impact: "High", status: "doing" },
  { id: "hours", where: "All listings", title: "Keep your hours the same everywhere", detail: "Done Sep 18. Your score rose 4 points in the scans after.", impact: "Medium", status: "done" },
];

const COLUMNS: { status: Status; label: string; icon: typeof Check; tone: string }[] = [
  { status: "suggested", label: "Suggested", icon: CircleDashed, tone: "text-primary" },
  { status: "doing", label: "In progress", icon: CircleDot, tone: "text-mid" },
  { status: "done", label: "Done", icon: Check, tone: "text-good" },
];

/** The Actions board (mockup-ui) with made-up fixes; Accept and Mark done move cards in the browser only. */
export function FixStepsExample() {
  const [fixes, setFixes] = useState(FIXES);
  const move = (id: string, status: Status) => setFixes((all) => all.map((f) => (f.id === id ? { ...f, status } : f)));
  return (
    <ProductFrame page="Actions">
      <div className="grid gap-3 bg-surface p-4 md:grid-cols-3">
        {COLUMNS.map((c) => {
          const items = fixes.filter((f) => f.status === c.status);
          return (
            <div key={c.status} className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-muted p-2.5">
              <p className="flex items-center gap-2 px-1 text-[13px] font-semibold">
                <c.icon className={cn("size-4", c.tone)} aria-hidden="true" />
                {c.label}
                <span className="rounded-sm border border-border bg-surface px-1.5 text-[11px] font-medium text-muted-foreground">{items.length}</span>
              </p>
              {items.map((f) => (
                <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-primary-hover">{f.where}</span>
                    <span className={cn("rounded-sm px-1.5 py-px font-medium", f.impact === "High" ? "bg-low-bg text-low-text" : "bg-mid-bg text-mid-text")}>{f.impact}</span>
                  </div>
                  <p className="text-[13.5px] leading-snug font-semibold">{f.title}</p>
                  <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{f.detail}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-text-hint">
                      <CalendarDays className="size-3" aria-hidden="true" />
                      Oct 2
                    </span>
                    {f.status === "suggested" && (
                      <Button size="xs" onClick={() => move(f.id, "doing")}>
                        Accept
                      </Button>
                    )}
                    {f.status === "doing" && (
                      <Button size="xs" variant="outline" onClick={() => move(f.id, "done")}>
                        Mark done
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-5 text-center text-xs text-text-hint">Nothing here yet.</p>}
            </div>
          );
        })}
      </div>
    </ProductFrame>
  );
}
