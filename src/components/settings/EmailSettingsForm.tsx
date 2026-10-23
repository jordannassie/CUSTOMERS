"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { Switch } from "@/components/ui/switch";
import { FormError, Panel } from "./SettingsSection";

export type SaveEmailPreferencesAction = (input: { weeklyReport: boolean }) => Promise<ActionResult<{ weeklyReport: boolean }>>;

// EMAIL-01: the weekly report is the only email an owner can turn off (D-37). It saves as soon as it is switched;
// a failed save puts the switch back.
export function EmailSettingsForm({ weeklyReport, save }: { weeklyReport: boolean; save: SaveEmailPreferencesAction }) {
  const [on, setOn] = useState(weeklyReport);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function change(next: boolean) {
    setError(null);
    setOn(next);
    startSave(async () => {
      const result = await save({ weeklyReport: next });
      if (!result.ok) {
        setOn(!next);
        return setError(result.error);
      }
      toast.success(next ? "Weekly report turned on" : "Weekly report turned off");
    });
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor="weekly-report" className="text-sm font-medium">
            Weekly report
          </label>
          <p id="weekly-report-text" className="mt-1 text-[13px] text-muted-foreground">
            Every Monday: how each business&apos;s score changed and any new opportunities.
          </p>
        </div>
        <Switch
          id="weekly-report"
          checked={on}
          onCheckedChange={change}
          disabled={saving}
          aria-describedby="weekly-report-text"
          className="mt-0.5"
        />
      </div>
      <FormError message={error} />
    </Panel>
  );
}
