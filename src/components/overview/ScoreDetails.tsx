"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { OverviewView } from "@/modules/overview";

type Details = NonNullable<OverviewView["score"]>["details"];

// The first version of the details panel; B-57 adds the full method and the calibration result.
export function ScoreDetails({ details, models }: { details: Details; models: OverviewView["models"] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="h-auto p-0">
          How is this calculated?
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>How your score is calculated</SheetTitle>
          <SheetDescription>
            We ask AI the questions your customers ask, with web search on and your city as the location, and count how
            often it recommends you.
          </SheetDescription>
        </SheetHeader>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 px-4 text-sm">
          <dt className="text-muted-foreground">Time covered</dt>
          <dd className="tabular-nums">Last 30 days</dd>
          <dt className="text-muted-foreground">Answers checked</dt>
          <dd className="tabular-nums">{details.checks}</dd>
          <dt className="text-muted-foreground">Different answers</dt>
          <dd className="tabular-nums">{details.uniqueAnswers}</dd>
          <dt className="text-muted-foreground">Margin of error</dt>
          <dd className="tabular-nums">plus or minus {details.margin} points</dd>
          {models.map((m) => (
            <div key={m.id} className="contents">
              <dt className="text-muted-foreground">{m.label}</dt>
              <dd className="tabular-nums">{m.score ?? "No checks yet"}</dd>
            </div>
          ))}
        </dl>
        <p className="px-4 text-sm text-muted-foreground">
          The score is the average of the AI models you chose, each counted equally. An arrow appears only when a change
          is bigger than the margin of error, so small day-to-day swings do not look like progress.
        </p>
      </SheetContent>
    </Sheet>
  );
}
