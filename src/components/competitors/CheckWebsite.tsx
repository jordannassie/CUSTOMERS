"use client";

import { useState, useTransition } from "react";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocalDate } from "@/components/ui/local-date";
import type { ActionResult } from "@/modules/auth";
import type { WebsiteView } from "@/modules/competitors";
import type { SaveWebsiteAction } from "./CompetitorWebsite";

export type CheckWebsiteAction = (input: {
  businessId: string;
  competitorId: string;
  domain: string;
}) => Promise<ActionResult<{ status: "read" | "blocked" | "unreachable" | "reading"; reused: boolean }>>;

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/**
 * "Check their website" (B-91, D-85): reads the competitor's own site once, for everyone. Once read it says so here and
 * on every other screen, with no way to read it again; while another tab or button is reading it, it says that instead.
 * With no website known yet, the owner types it first (saved as their entry, D-73). The page refreshes itself when done.
 */
export function CheckWebsite({
  businessId,
  competitorId,
  name,
  website,
  check,
  save,
}: {
  businessId: string;
  competitorId: string;
  name: string;
  website: WebsiteView;
  check: CheckWebsiteAction;
  save: SaveWebsiteAction;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyElsewhere, setBusyElsewhere] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(domain: string | null) {
    setError(null);
    startTransition(async () => {
      let target = domain;
      if (!target) {
        const saved = await save({ businessId, competitorId, website: value }).catch(() => null);
        if (!saved?.ok) return setError(saved && !saved.ok ? saved.error : "We couldn't save that website. Try again.");
        target = saved.data.domain;
      }
      if (!target) return setError("Enter a website like theirsite.com.");
      const result = await check({ businessId, competitorId, domain: target }).catch(() => null);
      if (!result) return setError("We couldn't check right now. Try again in a few minutes.");
      if (!result.ok) return setError(result.error);
      if (result.data.status === "reading") setBusyElsewhere(true);
    });
  }

  if (pending) {
    return (
      <p role="status" className="flex items-center gap-2 text-[13px] text-muted-foreground" data-testid="website-checking">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Reading their website. This takes about 30 seconds.
      </p>
    );
  }

  const checked = website.checked && website.checkedAt;
  return (
    <div className="flex flex-col gap-2" data-testid="check-website">
      {!checked && (website.checking || busyElsewhere) ? (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground" data-testid="website-being-checked">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          Being checked now. The results show here when you reload in a minute.
        </p>
      ) : checked ? (
        <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
          <Globe className="size-3.5" aria-hidden="true" />
          {website.domain}
          <span aria-hidden="true">·</span>
          {website.status === "read" ? "checked" : website.status === "blocked" ? "blocks readers, checked" : "didn't load, checked"}{" "}
          <LocalDate iso={website.checkedAt!} options={SHORT} />
        </p>
      ) : website.domain ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{website.domain}</span>
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => run(website.domain)} data-testid="check-website-button">
            Check their website
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(null);
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="theirsite.com"
            aria-label={`Website for ${name}`}
            maxLength={200}
            className="h-8 w-44 max-w-full min-w-0 text-[13px]"
          />
          <Button type="submit" size="sm" className="h-8" disabled={!value.trim()}>
            Check their website
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-low-text">
          {error}
        </p>
      )}
    </div>
  );
}
