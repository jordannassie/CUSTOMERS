"use client";

import { Suspense, use, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, CircleDashed, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADD_BUSINESS_PATH } from "@/modules/onboarding/wizard/steps";
import type { SwitcherScore, SwitcherScores } from "@/modules/workspace";

export type SwitcherBusiness = { id: string; name: string; domain: string | null; logoUrl: string | null };
/** The agency's unfinished draft: "Finish setting up <name>", linking to the step where it stopped. */
export type SwitcherDraft = { label: string; href: string };

// Switching opens the other business's Overview, so no page is left showing the business it was opened for.
const OVERVIEW_HREF = "/dashboard";
export type SwitchBusinessAction = (
  input: { businessId: string },
) => Promise<{ ok: true } | { ok: false; error: string }>;
/** The scores, asked for when the switcher opens so no page load waits on (or pays for) every business's score. */
export type SwitcherScoresAction = () => Promise<{ ok: true; data: SwitcherScores | null } | { ok: false; error: string }>;

function BusinessMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logos come from any domain the user entered
      <img
        src={logoUrl}
        alt=""
        className="size-6 shrink-0 rounded-sm border border-border bg-surface object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-tint text-xs font-semibold text-primary-hover"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const DOT = { good: "bg-good", mid: "bg-mid", low: "bg-low" } as const;

/** Score with its status dot, the last scan, and a real weekly change (DB-011). */
function ScoreLine({ score }: { score: SwitcherScore }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
      {score.change && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium",
            score.change.direction === "up" ? "text-good-text" : "text-low-text",
          )}
          data-testid="switcher-change"
        >
          {score.change.direction === "up" ? (
            <ArrowUp className="size-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3" aria-hidden="true" />
          )}
          {score.change.direction === "up" ? "Up" : "Down"} {score.change.points}
        </span>
      )}
      {score.lastScan}
    </span>
  );
}

type ItemsProps = {
  businesses: SwitcherBusiness[];
  activeId: string;
  pending: boolean;
  target: string | null;
  choose: (id: string) => void;
};

function ScoredItems({ scores, ...props }: ItemsProps & { scores: Promise<SwitcherScores | null> }) {
  return <Items {...props} scores={use(scores)} />;
}

function Items({ businesses, activeId, pending, target, choose, scores }: ItemsProps & { scores: SwitcherScores | null }) {
  const byId = new Map(businesses.map((b) => [b.id, b]));
  const ordered = scores ? scores.order.flatMap((id) => byId.get(id) ?? []) : businesses;
  // A business added since the scores loaded still shows, at the end.
  const listed = [...ordered, ...businesses.filter((b) => !ordered.includes(b))];
  return listed.map((b) => {
    const score = scores?.byId[b.id];
    return (
      <DropdownMenuItem
        key={b.id}
        onSelect={() => choose(b.id)}
        disabled={pending}
        className="items-start gap-2.5 py-2"
        aria-current={b.id === activeId ? "true" : undefined}
        title={b.name}
        data-testid="switcher-item"
      >
        <BusinessMark name={b.name} logoUrl={b.logoUrl} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="line-clamp-2 break-words">{b.name}</span>
          {score && <ScoreLine score={score} />}
        </span>
        {score?.score != null && score.tone && (
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums" data-testid="switcher-score">
            <span className={cn("size-2 rounded-full", DOT[score.tone])} aria-hidden="true" />
            {score.score}
          </span>
        )}
        {target === b.id ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <Check className={cn("size-4 shrink-0 text-primary", b.id !== activeId && "invisible")} aria-hidden="true" />
        )}
      </DropdownMenuItem>
    );
  });
}

export function BusinessSwitcher({
  businesses,
  activeBusinessId,
  switchBusiness,
  onSwitched,
  loadScores,
  draft = null,
}: {
  businesses: SwitcherBusiness[];
  activeBusinessId: string;
  /** Shown instead of Add business: with a draft open, adding one means finishing it (one draft per agency). */
  draft?: SwitcherDraft | null;
  switchBusiness: SwitchBusinessAction;
  onSwitched?: () => void;
  /** Asked for on the first open for the current business; until it answers the list shows without scores. */
  loadScores?: SwitcherScoresAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [scores, setScores] = useState<{ forId: string; promise: Promise<SwitcherScores | null> } | null>(null);
  const active = businesses.find((b) => b.id === activeBusinessId) ?? businesses[0];

  function onOpenChange(open: boolean) {
    if (!open || !loadScores || scores?.forId === active.id) return;
    const promise = loadScores()
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null);
    setScores({ forId: active.id, promise });
  }

  function choose(id: string) {
    if (id === active.id) return;
    setTarget(id);
    startTransition(async () => {
      const result = await switchBusiness({ businessId: id });
      if (result.ok) {
        onSwitched?.();
        router.push(OVERVIEW_HREF);
      } else toast.error(result.error);
      setTarget(null);
    });
  }

  const items: ItemsProps = { businesses, activeId: active.id, pending, target, choose };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-2 text-left outline-none transition-colors hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Business: ${active.name}. Switch business`}
        title={active.name}
        data-testid="business-switcher"
      >
        <BusinessMark name={active.name} logoUrl={active.logoUrl} />
        {/* Long names get two lines, so the start of the name and the domain both stay readable. */}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-medium break-words text-foreground" data-testid="switcher-name">
            {active.name}
          </span>
          {active.domain && <span className="block truncate text-xs text-muted-foreground" title={active.domain}>{active.domain}</span>}
        </span>
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Switching" />
        ) : (
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
        {scores ? (
          <Suspense fallback={<Items {...items} scores={null} />}>
            <ScoredItems {...items} scores={scores.promise} />
          </Suspense>
        ) : (
          <Items {...items} scores={null} />
        )}
        <DropdownMenuSeparator />
        {draft ? (
          <DropdownMenuItem asChild className="items-start gap-2.5 py-2 text-foreground" title={draft.label}>
            <Link href={draft.href} onClick={onSwitched} data-testid="switcher-draft">
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="line-clamp-2 min-w-0 break-words">{draft.label}</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild className="gap-2.5 py-2 text-muted-foreground">
            <Link href={ADD_BUSINESS_PATH} onClick={onSwitched}>
              <Plus className="size-4" aria-hidden="true" />
              Add business
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
