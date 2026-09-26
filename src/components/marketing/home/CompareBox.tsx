"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidDomain } from "./lib";

export function CompareBox() {
  const router = useRouter();
  const [mine, setMine] = useState("");
  const [theirs, setTheirs] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidDomain(mine)) return setError("Enter your website, for example yourbusiness.com.");
    if (!isValidDomain(theirs)) return setError("Enter a competitor's website, for example competitor.com.");
    setError(null);
    router.push(`/compare?my=${encodeURIComponent(mine.trim())}&them=${encodeURIComponent(theirs.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-describedby="compare-hint"
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 sm:p-5"
    >
      <p className="text-[15px] font-semibold">Compare your website with a competitor&apos;s</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compare-mine">Your website</Label>
          <Input
            id="compare-mine"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="yourbusiness.com"
            value={mine}
            onChange={(e) => setMine(e.target.value)}
            aria-invalid={error?.startsWith("Enter your") || undefined}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compare-theirs">Competitor&apos;s website</Label>
          <Input
            id="compare-theirs"
            inputMode="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="competitor.com"
            value={theirs}
            onChange={(e) => setTheirs(e.target.value)}
            aria-invalid={error?.startsWith("Enter a competitor") || undefined}
            className="h-11"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-low-text">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="h-11 px-5">
          Compare free
        </Button>
        <p id="compare-hint" className="text-[13px] text-text-hint">
          No account needed. Checks the website basics AI assistants read.
        </p>
      </div>
    </form>
  );
}
