"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/modules/auth";

export type SaveWebsiteAction = (input: { businessId: string; competitorId: string; website: string }) => Promise<ActionResult<{ domain: string | null }>>;

// "Add website" when Google lists none for a competitor. What the user types is saved as their own entry (D-73) and
// used to spot the competitor in AI answers.
export function CompetitorWebsite({
  businessId,
  competitorId,
  name,
  current,
  save,
}: {
  businessId: string;
  competitorId: string;
  name: string;
  current: string | null;
  save: SaveWebsiteAction;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="link" size="sm" className="h-auto self-start p-0 text-[13px]" onClick={() => setOpen(true)} data-testid="add-website">
        {current ? "Edit" : "Add website"}
      </Button>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await save({ businessId, competitorId, website: value });
      if (!result.ok) return setError(result.error);
      setOpen(false);
      toast.success(result.data.domain ? `Website saved for ${name}.` : `Website removed for ${name}.`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5" aria-label={`Website for ${name}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="theirsite.com"
          aria-label={`Website for ${name}`}
          maxLength={200}
          className="h-8 w-40 max-w-full min-w-0 text-[13px]"
          autoFocus
        />
        <Button type="submit" size="sm" className="h-8" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[12px] text-low-text">
          {error}
        </p>
      ) : null}
    </form>
  );
}
