"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidDomain } from "@/components/marketing/home/lib";

type Props = {
  initialMine: string;
  initialTheirs: string;
  loading: boolean;
  /** null renders the static shell shown before the page's search params load. */
  onSubmit: ((mine: string, theirs: string) => void) | null;
  serverError?: string | null;
};

export function CheckForm({ initialMine, initialTheirs, loading, onSubmit, serverError }: Props) {
  const [mine, setMine] = useState(initialMine);
  const [theirs, setTheirs] = useState(initialTheirs);
  const [error, setError] = useState<string | null>(null);
  const shown = error ?? serverError;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidDomain(mine)) return setError("Enter your website, for example yourbusiness.com.");
    if (!isValidDomain(theirs)) return setError("Enter a competitor's website, for example competitor.com.");
    setError(null);
    onSubmit?.(mine.trim(), theirs.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="AI readiness check"
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check-mine">Your website</Label>
          <Input
            id="check-mine"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="yourbusiness.com"
            value={mine}
            onChange={(e) => setMine(e.target.value)}
            aria-invalid={error?.startsWith("Enter your") || undefined}
            disabled={loading}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check-theirs">Competitor&apos;s website</Label>
          <Input
            id="check-theirs"
            inputMode="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="competitor.com"
            value={theirs}
            onChange={(e) => setTheirs(e.target.value)}
            aria-invalid={error?.startsWith("Enter a competitor") || undefined}
            disabled={loading}
            className="h-11"
          />
        </div>
        <Button type="submit" size="lg" className="h-11 px-5" disabled={loading || !onSubmit}>
          {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {loading ? "Checking" : "Check both sites"}
        </Button>
      </div>
      {shown && (
        <p role="alert" className="text-[13px] text-low-text">
          {shown}
        </p>
      )}
    </form>
  );
}
