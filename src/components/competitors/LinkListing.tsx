"use client";

import { useState, useTransition } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import type { ActionResult } from "@/modules/auth";
import type { ListingSearch } from "@/modules/onboarding";

type Target = { businessId: string; competitorId?: string };
export type ListingActions = {
  search: (input: Target & { query?: string }) => Promise<ActionResult<ListingSearch>>;
  link: (input: Target & { placeId: string }) => Promise<ActionResult<null>>;
};

/**
 * "Link Google listing" (owner, 2026-11-17): for you or a competitor with no Google listing, a Google search the owner
 * runs, then a pick. Only the picked listing's id is saved (D-73); names and addresses are shown from Google live.
 */
export function LinkListing({ target, name, actions }: { target: Target; name: string; actions: ListingActions }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ListingSearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [linking, startLink] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);

  function run(q?: string) {
    setError(null);
    startSearch(async () => {
      const res = await actions.search({ ...target, query: q });
      if (!res.ok) return setError(res.error);
      setResult(res.data);
      setQuery(res.data.query);
    });
  }

  function choose(placeId: string) {
    setError(null);
    setPicked(placeId);
    startLink(async () => {
      const res = await actions.link({ ...target, placeId });
      if (!res.ok) {
        setPicked(null);
        return setError(res.error);
      }
      setOpen(false);
      toast.success(`${name} is linked to Google. Its details load in a moment.`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto self-start p-0 text-[length:calc(13px*var(--px,1))]"
        onClick={() => {
          setOpen(true);
          // The first search runs on its own, with the name and city: the owner usually only has to pick.
          if (!result && !searching) run();
        }}
        data-testid="link-listing"
      >
        Link Google listing
      </Button>
      <DialogContent className="sm:max-w-md" data-testid="link-listing-dialog">
        <DialogHeader>
          <DialogTitle>Find {name} on Google</DialogTitle>
          <DialogDescription>Pick its Google listing, so its reviews, rating and hours show here. We only keep which listing it is.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(query);
          }}
        >
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name and city" aria-label="Search Google for" maxLength={120} />
          <Button type="submit" variant="outline" disabled={searching || query.trim().length < 2}>
            {searching ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
            Search
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-low-text">
            {error}
          </p>
        )}
        {searching && !result ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Searching Google…
          </p>
        ) : result && result.choices.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="link-listing-none">
            No Google listing found for “{result.query}”. Try another name, or add the area.
          </p>
        ) : result ? (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border" data-testid="link-listing-choices">
            {result.choices.map((c) => (
              <li key={c.placeId} className="flex items-center gap-3 px-3 py-2.5">
                <MapPin className="size-4 shrink-0 text-text-hint" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  {c.address && <p className="truncate text-[length:calc(12.5px*var(--px,1))] text-muted-foreground">{c.address}</p>}
                </div>
                <Button type="button" size="sm" variant="outline" disabled={linking} onClick={() => choose(c.placeId)}>
                  {linking && picked === c.placeId ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  This one
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <GoogleAttribution what="Listings" />
      </DialogContent>
    </Dialog>
  );
}
