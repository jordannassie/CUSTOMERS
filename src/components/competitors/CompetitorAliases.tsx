"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import type { CompetitorNames } from "@/modules/competitors";
import { ALIASES_MAX } from "@/modules/settings/schema";
import { aliasesProblem, aliasExample, parseServices } from "@/modules/settings/service";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Save = (input: unknown) => Promise<ActionResult<{ changed: number }>>;

/**
 * Other names AI may use for each tracked competitor (migration 055): "KFC" for "Kentucky Fried Chicken". Saving
 * checks saved answers again, so they count for that competitor from today's score on.
 */
export function CompetitorAliases({ businessId, competitors, save }: { businessId: string; competitors: CompetitorNames[]; save: Save }) {
  const initial = Object.fromEntries(competitors.map((c) => [c.id, c.aliases.join(", ")]));
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = competitors.some((c) => (form[c.id] ?? "") !== (saved[c.id] ?? ""));

  if (competitors.length === 0) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bad = Object.fromEntries(
      competitors.flatMap((c) => {
        const problem = aliasesProblem(parseServices(form[c.id] ?? ""));
        return problem ? [[c.id, problem]] : [];
      }),
    );
    setErrors(bad);
    const first = competitors.find((c) => bad[c.id]);
    if (first) return document.getElementById(`aliases-${first.id}`)?.focus();
    startTransition(async () => {
      const result = await save({
        businessId,
        competitors: competitors.map((c) => ({ id: c.id, aliases: parseServices(form[c.id] ?? "") })),
      });
      if (!result.ok) return setError(result.error);
      setSaved(form);
      toast.success(result.data.changed ? "Other names saved. Past answers were checked again." : "Nothing changed");
    });
  }

  return (
    <section aria-labelledby="competitor-aliases-title" className="mt-10 max-w-2xl overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border px-[18px] py-3.5">
        <h2 id="competitor-aliases-title" className="text-[14.5px] font-semibold tracking-[-0.01em]">
          Other names
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Short names, old names or other spellings AI may use for a competitor, separated with commas, up to {ALIASES_MAX} each.
          Answers that use them count for that competitor.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5 px-[18px] py-4" aria-label="Competitors' other names" noValidate>
        {competitors.map((c) => {
          const id = `aliases-${c.id}`;
          return (
            <div key={c.id} className="flex flex-col gap-2">
              <Label htmlFor={id} className="break-words">
                {c.name}
              </Label>
              <Input
                id={id}
                value={form[c.id] ?? ""}
                onChange={(e) => {
                  setForm((f) => ({ ...f, [c.id]: e.target.value }));
                  setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== c.id)));
                }}
                maxLength={1300}
                placeholder={aliasExample(c.name)}
                autoComplete="off"
                aria-invalid={errors[c.id] ? true : undefined}
                aria-describedby={errors[c.id] ? `${id}-error` : undefined}
              />
              <FieldMessage id={`${id}-error`} message={errors[c.id]} />
            </div>
          );
        })}
        {error ? (
          <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? "Saving" : "Save other names"}
          </Button>
        </div>
      </form>
    </section>
  );
}
