"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActionResult } from "@/modules/auth";
import type { OpportunityItem, Status } from "@/modules/opportunities";
// Plain label files, safe in the browser; the module indexes also export server code.
import { Globe, Link2, MapPin } from "lucide-react";
import { byWhere, fixAnchor, fixCardId, type Where } from "@/modules/opportunities/where";
import { WHERE_TEXT } from "@/modules/standing/where";
import { OpportunityCard } from "./OpportunityCard";

type SetStatus = (input: { businessId: string; opportunityId: string; status: Status }) => Promise<ActionResult<{ status: Status }>>;

const TABS: { status: Status; label: string; empty: string }[] = [
  { status: "open", label: "To do", empty: "Nothing left to do. New fixes show up here after your next scan." },
  { status: "done", label: "Done", empty: "Fixes you mark as done show up here." },
  { status: "dismissed", label: "Dismissed", empty: "Fixes you dismiss show up here, in case you change your mind." },
];

const DONE_NOTE: Record<Status, string> = {
  open: "Moved back to your to-do list.",
  done: "Marked as done.",
  dismissed: "Dismissed.",
};

// Errors the action returned are written for users; anything else (a dropped connection) gets a plain message.
class ActionError extends Error {}

export function OpportunityList({
  businessId,
  initialItems,
  setStatus,
  openId = null,
}: {
  businessId: string;
  initialItems: OpportunityItem[];
  setStatus: SetStatus;
  /** A fix picked on another page (/opportunities?fix=<id>): it opens instead of the first one, in its own tab. */
  openId?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  // Read once, from the list the page arrived with, so changing a status later never moves which card is open.
  const [target] = useState(() => initialItems.find((o) => o.id === openId) ?? null);

  // A picked fix, or a "Fix on ..." group (/opportunities#fix-website), is scrolled into view.
  useEffect(() => {
    const id = target ? fixCardId(target.id) : window.location.hash.slice(1);
    if (target || id.startsWith("fix-")) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [target]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function change(item: OpportunityItem, status: Status) {
    const move = (to: Status) => setItems((all) => all.map((o) => (o.id === item.id ? { ...o, status: to } : o)));
    setBusyId(item.id);
    move(status);
    try {
      const result = await setStatus({ businessId, opportunityId: item.id, status });
      if (!result.ok) throw new ActionError(result.error);
      toast.success(DONE_NOTE[status]);
    } catch (error) {
      move(item.status);
      toast.error(error instanceof ActionError ? error.message : "That change could not be saved. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Tabs defaultValue={target?.status ?? "open"} className="gap-4">
      <TabsList className="w-full sm:w-fit">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.status} value={tab.status} className="px-3" data-testid={`tab-${tab.status}`}>
            {tab.label}
            <span className="tabular-nums text-muted-foreground">{items.filter((o) => o.status === tab.status).length}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab) => {
        const shown = items.filter((o) => o.status === tab.status);
        return (
          <TabsContent key={tab.status} value={tab.status} className="flex flex-col gap-3" data-testid={`list-${tab.status}`}>
            {shown.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                {tab.empty}
              </p>
            ) : (
              byWhere(shown).map((group, g) => (
                // scroll-mt leaves room above the group when a "Fix on ..." link opens it, under the phone's top bar too.
                <section
                  key={group.where}
                  id={tab.status === "open" ? fixAnchor(group.where) : undefined}
                  className="flex scroll-mt-20 flex-col gap-3 lg:scroll-mt-8"
                  data-testid={`group-${group.where}`}
                >
                  <header className={g === 0 ? "flex items-center gap-2" : "mt-3 flex items-center gap-2"}>
                    <GroupIcon where={group.where} />
                    <h2 className="text-sm font-semibold">{WHERE_TEXT[group.where]}</h2>
                    <span className="rounded-xs bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{group.items.length}</span>
                  </header>
                  {group.items.map((item, i) => (
                    <OpportunityCard
                      key={item.id}
                      item={item}
                      busy={busyId === item.id}
                      onStatus={(s) => change(item, s)}
                      // The picked fix opens on its own; otherwise the first card of the first group, as before.
                      defaultOpen={target && target.status === tab.status ? item.id === target.id : g === 0 && i === 0}
                    />
                  ))}
                </section>
              ))
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

const GROUP_ICON: Record<Where, typeof Globe> = { website: Globe, google_listing: MapPin, other_places: Link2 };

function GroupIcon({ where }: { where: Where }) {
  const Icon = GROUP_ICON[where];
  return (
    <span className="flex size-6 items-center justify-center rounded-md bg-primary-tint text-primary" aria-hidden="true">
      <Icon className="size-3.5" />
    </span>
  );
}
