"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActionResult } from "@/modules/auth";
import type { OpportunityItem, Status } from "@/modules/opportunities";
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
}: {
  businessId: string;
  initialItems: OpportunityItem[];
  setStatus: SetStatus;
}) {
  const [items, setItems] = useState(initialItems);
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
    <Tabs defaultValue="open" className="gap-4">
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
          <TabsContent key={tab.status} value={tab.status} className="flex flex-col gap-4" data-testid={`list-${tab.status}`}>
            {shown.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                {tab.empty}
              </p>
            ) : (
              shown.map((item) => (
                <OpportunityCard key={item.id} item={item} busy={busyId === item.id} onStatus={(s) => change(item, s)} />
              ))
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
