"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/modules/auth";
import { canHide, SECTION_TITLES, SECTIONS, type SectionId } from "@/modules/reports/sections";

type SaveAction = (input: unknown) => Promise<ActionResult<{ hidden: SectionId[] }>>;

/** Section toggles, saved for the business at once: a hidden section is left out of the page, every link and the PDF. */
export function SectionToggles({ businessId, initialHidden, save }: { businessId: string; initialHidden: SectionId[]; save: SaveAction }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [, startTransition] = useTransition();

  function toggle(section: SectionId, on: boolean) {
    const before = hidden;
    const next = on ? hidden.filter((s) => s !== section) : [...hidden, section];
    setHidden(next);
    startTransition(async () => {
      const result = await save({ businessId, hidden: next }).catch(() => null);
      if (result?.ok) return;
      setHidden(before);
      toast.error(result?.error ?? "That change could not be saved. Try again in a moment.");
    });
  }

  return (
    <section aria-labelledby="report-sections" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5" data-testid="section-toggles">
      <div className="flex flex-col gap-1">
        <h2 id="report-sections" className="text-base font-semibold tracking-[-0.02em]">
          Sections
        </h2>
        <p className="text-xs text-muted-foreground">Hidden sections are left out of the share link and the PDF too.</p>
      </div>
      <ul className="flex flex-col">
        {SECTIONS.map((section) => {
          const on = !hidden.includes(section);
          const id = `section-${section}`;
          return (
            <li key={section} className="flex min-h-9 items-center justify-between gap-3">
              <label htmlFor={id} className="text-sm">
                {SECTION_TITLES[section]}
              </label>
              <Switch id={id} checked={on} disabled={on && !canHide(hidden, section)} onCheckedChange={(checked) => toggle(section, checked)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
