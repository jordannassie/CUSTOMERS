"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import type { CompetitorCandidate } from "@/modules/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAttribution, PlaceRating } from "./PlaceBits";

export type LookupAction = (input: {
  businessId: string;
  name: string;
}) => Promise<ActionResult<{ matches: CompetitorCandidate[]; note: string | null }>>;

type Props = {
  businessId: string;
  lookup: LookupAction;
  isPicked: (c: { name: string; placesId: string | null }) => boolean;
  /** Returns false when the plan limit stopped it. */
  onAdd: (c: { name: string; placesId: string | null; live: CompetitorCandidate | null }) => boolean;
};

// "Add by name": the Google match is optional, the typed name always works (MVP_SPEC 3.1 step 5).
export function AddCompetitor({ businessId, lookup, isPicked, onAdd }: Props) {
  const [name, setName] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [matches, setMatches] = useState<CompetitorCandidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function find(e: React.FormEvent) {
    e.preventDefault();
    const typed = name.trim();
    if (typed.length < 2) return setMessage("Type at least 2 letters of the business name.");
    setMessage(null);
    startTransition(async () => {
      const result = await lookup({ businessId, name: typed });
      setSearched(typed);
      if (!result.ok) {
        setMatches([]);
        return setMessage(result.error);
      }
      setMatches(result.data.matches);
      setMessage(result.data.note);
    });
  }

  function addTyped() {
    if (searched && onAdd({ name: searched, placesId: null, live: null })) {
      setName("");
      setSearched(null);
      setMatches([]);
    }
  }

  const typedPicked = searched ? isPicked({ name: searched, placesId: null }) : false;

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={find} className="flex gap-2" role="search" aria-label="Find a competitor by name">
        <label htmlFor="competitor-name" className="sr-only">
          Competitor name
        </label>
        <Input
          id="competitor-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Business name, like Blue Door Coffee"
          maxLength={120}
          autoComplete="off"
        />
        <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Search aria-hidden />}
          Find
        </Button>
      </form>

      {message ? (
        <p role="status" className="text-[13px] text-muted-foreground">
          {message}
        </p>
      ) : null}

      {searched ? (
        <div className="rounded-md border border-border bg-surface">
          {matches.length ? (
            <>
              <ul className="divide-y divide-border" aria-label={`Google matches for ${searched}`}>
                {matches.map((m) => {
                  const added = isPicked({ name: m.name, placesId: m.placeId });
                  return (
                    <li key={m.placeId} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.name}</span>
                        {m.address ? <span className="block truncate text-[13px] text-muted-foreground">{m.address}</span> : null}
                      </span>
                      <PlaceRating rating={m.rating} reviewCount={m.reviewCount} />
                      <Button
                        type="button"
                        size="sm"
                        variant={added ? "ghost" : "outline"}
                        disabled={added}
                        onClick={() => onAdd({ name: m.name, placesId: m.placeId, live: m })}
                        aria-label={added ? `${m.name} added` : `Add ${m.name}`}
                      >
                        {added ? <Check aria-hidden /> : <Plus aria-hidden />}
                        {added ? "Added" : "Add"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <GoogleAttribution className="border-t border-border px-4 py-2" />
            </>
          ) : (
            <p className="px-4 py-3 text-[13px] text-muted-foreground">No Google listing matched &ldquo;{searched}&rdquo;.</p>
          )}
          <div className="border-t border-border px-4 py-2">
            <Button type="button" variant="link" size="sm" className="h-auto px-0" disabled={typedPicked} onClick={addTyped}>
              {typedPicked ? `"${searched}" is on your list` : `Add "${searched}" as typed`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
