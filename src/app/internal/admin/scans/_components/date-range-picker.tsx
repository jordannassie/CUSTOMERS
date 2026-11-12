"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { canMove, inRange, monthGrid, openingMonth, pickDay, PRESETS, rangeLabel, selectable, type DayRange } from "./date-range";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthName = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const fullDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * Pick a date range by clicking, no typing (2026-11-12): a quick choice, or two days on the calendar (first click
 * starts the range, second ends it). `onChange` runs as soon as a range is complete. Only the last 12 months up to
 * today can be picked, and it always opens on the chosen range or this month.
 */
export default function DateRangePicker({ value, onChange }: { value: DayRange; onChange: (range: DayRange) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRange>(value);
  const [picking, setPicking] = useState(false);
  const [view, setView] = useState(() => openingMonth(value, new Date()));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  function choose(range: DayRange) {
    setOpen(false);
    setPicking(false);
    onChange(range);
  }

  function move(by: number) {
    const d = new Date(Date.UTC(view.year, view.month + by, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(value);
          setView(openingMonth(value, new Date()));
          setPicking(false);
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button type="button" variant="outline" className="justify-start gap-2 font-normal" aria-label={`Date: ${rangeLabel(value)}. Change the date range`}>
          <CalendarDays aria-hidden className="text-muted-foreground" />
          {rangeLabel(value)}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 flex w-[min(calc(100vw-24px),calc(440px*var(--px,1)))] flex-col gap-3 rounded-md border border-border bg-surface p-3 text-[length:calc(13px*var(--px,1))] shadow-float sm:flex-row"
        >
          <ul className="flex flex-wrap gap-1 sm:w-32 sm:flex-col" aria-label="Quick choices">
            {PRESETS.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => choose(p.range(new Date()))}
                  className="w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => move(-1)} disabled={!canMove(view, -1, now)} aria-label="Previous month">
                <ChevronLeft aria-hidden />
              </Button>
              <span className="font-medium" aria-live="polite">
                {monthName(view.year, view.month)}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => move(1)} disabled={!canMove(view, 1, now)} aria-label="Next month">
                <ChevronRight aria-hidden />
              </Button>
            </div>
            <table className="w-full table-fixed border-collapse text-center" role="grid" aria-label={monthName(view.year, view.month)}>
              <thead>
                <tr>
                  {WEEKDAYS.map((d) => (
                    <th key={d} scope="col" className="pb-1 text-[length:calc(12px*var(--px,1))] font-medium text-text-hint">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthGrid(view.year, view.month).map((week, i) => (
                  <tr key={i}>
                    {week.map((day, j) => (
                      <td key={j} className="p-0.5">
                        {day && (
                          <button
                            type="button"
                            aria-label={fullDay(day)}
                            aria-pressed={inRange(day, draft)}
                            disabled={!selectable(day, now)}
                            onClick={() => {
                              const next = pickDay(draft, day, picking);
                              setDraft(next.range);
                              setPicking(!next.done);
                              if (next.done) choose(next.range);
                            }}
                            className={cn(
                              "grid h-8 w-full place-items-center rounded-sm tabular-nums hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:text-text-hint disabled:opacity-50 disabled:hover:bg-transparent",
                              inRange(day, draft) && "bg-primary-tint text-primary-hover hover:bg-primary-tint",
                              (day === draft.from || day === draft.to) && "bg-primary text-primary-foreground hover:bg-primary-hover",
                              day === today && !inRange(day, draft) && "font-semibold text-primary",
                            )}
                          >
                            {Number(day.slice(8))}
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-text-hint">{picking ? "Now pick the last day." : "Pick the first day, then the last."}</p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
