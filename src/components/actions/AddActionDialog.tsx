"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PLACE_TEXT, PLACES, type Place } from "@/modules/opportunities/board/service";
import type { AddToActionsAction } from "./AddToActionsButton";

/** The category for each place; the board reads the place itself back from evidence_data.place (no category says "Social"). */
const CATEGORY: Record<Place, string> = {
  website: "technical",
  google_listing: "local_presence",
  review_sites: "citations",
  social: "citations",
  content: "content",
};

/** "Add action": a fix the owner writes themselves, in To do, with where to apply it. */
export function AddActionDialog({ businessId, add }: { businessId: string; add: AddToActionsAction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [place, setPlace] = useState<Place>("website");
  const [impact, setImpact] = useState<"high" | "medium" | "low">("medium");

  function submit(form: FormData) {
    const title = String(form.get("title") ?? "").trim();
    const where = String(form.get("where") ?? "").trim() || PLACE_TEXT[place];
    const notes = String(form.get("notes") ?? "").trim();
    if (!title) {
      toast.error("Give the action a title.");
      return;
    }
    start(async () => {
      const result = await add({
        businessId,
        title,
        fact: notes || "Added by you.",
        whatToDo: notes || title,
        whereToApply: where,
        impact,
        category: CATEGORY[place],
        source: "manual",
        dedupeKey: `manual:${crypto.randomUUID()}`,
        evidenceData: { place },
      }).catch(() => null);
      if (!result?.ok) {
        toast.error(result && !result.ok ? result.error : "That action could not be added. Try again.");
        return;
      }
      toast.success("Added to To do.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-action">
          <Plus aria-hidden="true" />
          Add action
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an action</DialogTitle>
          <DialogDescription>A fix of your own, added to To do.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action-title">Title</Label>
            <Input id="action-title" name="title" maxLength={160} required placeholder="Add our new menu to the website" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action-place">Where</Label>
              <Select id="action-place" placeholder="Where" value={place} onValueChange={(v) => setPlace(v as Place)} options={PLACES.map((p) => ({ value: p, label: PLACE_TEXT[p] }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action-impact">Impact</Label>
              <Select
                id="action-impact"
                placeholder="Impact"
                value={impact}
                onValueChange={(v) => setImpact(v as typeof impact)}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action-where">Where to apply it</Label>
            <Input id="action-where" name="where" maxLength={200} placeholder="Home page, Google Business Profile, yelp.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action-notes">Notes</Label>
            <Textarea id="action-notes" name="notes" maxLength={600} rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Add to To do
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
