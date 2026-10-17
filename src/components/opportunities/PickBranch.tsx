"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/modules/auth";
import type { BranchSearch } from "@/modules/onboarding";

type SearchAction = (input: { businessId: string; query: string }) => Promise<ActionResult<BranchSearch>>;
type PickAction = (input: { businessId: string; placeId: string }) => Promise<ActionResult<null>>;

const UNAVAILABLE = "Google could not be searched right now. Try again in a few minutes.";

// Step 6d: a chain's website matches branches in several cities, so the owner picks theirs. The listings are shown
// live from Google; only the picked one's place ID is saved (D-73).
export function PickBranch({ businessId, initial, search, pick }: { businessId: string; initial: BranchSearch; search: SearchAction; pick: PickAction }) {
  const [query, setQuery] = useState(initial.query);
  const [result, setResult] = useState(initial);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSearch(async () => {
      const found = await search({ businessId, query });
      if (!found.ok) return setError(found.error);
      setResult(found.data);
      setChosen(null);
    });
  }

  function save() {
    if (!chosen) return setError("Choose your branch from the list.");
    setError(null);
    startSave(async () => {
      const saved = await pick({ businessId, placeId: chosen });
      if (!saved.ok) return setError(saved.error);
      toast.success("Branch saved. Its Google details now show on Competitors.");
    });
  }

  return (
    <section id="pick-branch" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5" data-testid="pick-branch">
      <div className="flex max-w-[620px] flex-col gap-3">
        <h2 className="text-base font-semibold tracking-[-0.02em]">Pick your branch on Google</h2>
        <p className="text-sm text-muted-foreground">
          Your website belongs to a business with several locations, so we didn&apos;t pick one for you. Choose the branch
          you manage, so we can compare its Google rating, reviews and hours with your competitors.
        </p>
      </div>

      <form onSubmit={runSearch} className="flex flex-col gap-2 sm:flex-row" role="search" aria-label="Search Google for your branch">
        <label htmlFor="branch-query" className="sr-only">
          Branch name and area
        </label>
        <Input id="branch-query" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} className="sm:max-w-sm" />
        <Button type="submit" variant="outline" disabled={searching}>
          {searching ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          Search
        </Button>
      </form>

      {result.unavailable ? (
        <p className="text-sm text-muted-foreground" data-testid="branch-unavailable">
          {UNAVAILABLE}
        </p>
      ) : result.choices.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="branch-none">
          No branch matched {result.query}. Try the area or street name, like your name plus &quot;F-7&quot;. If Google has no
          listing for your branch, add it at business.google.com.
        </p>
      ) : (
        <div className="rounded-md border border-border">
          <ul className="divide-y divide-border" data-testid="branch-choices">
            {result.choices.map((c) => (
              <li key={c.placeId}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 has-checked:bg-primary-tint">
                  <input
                    type="radio"
                    name="branch"
                    value={c.placeId}
                    checked={chosen === c.placeId}
                    onChange={() => setChosen(c.placeId)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">{c.name}</span>
                    {c.address ? <span className="block text-[13px] break-words text-muted-foreground">{c.address}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <GoogleAttribution what="Listings" className="border-t border-border px-4 py-2" />
        </div>
      )}

      {error ? (
        <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
          {error}
        </p>
      ) : null}
      {result.choices.length > 0 ? (
        <div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            This is my branch
          </Button>
        </div>
      ) : null}
    </section>
  );
}
